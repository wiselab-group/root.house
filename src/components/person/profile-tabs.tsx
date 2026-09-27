"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ContentsMenu } from "@/components/hero/contents-menu";
import { ProfileTabList } from "./profile-tab-list";

export interface ProfilePanel {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/**
 * Section navigation for the Person Profile, two shapes by explicit user
 * request (2026-09-24): on desktop (md+) real tabs — one panel visible at a
 * time; on phones no tabs at all, the page stays one long scroll and a
 * sticky «Содержание» pill opens a menu of anchor links instead.
 *
 * Panels are server-rendered ReactNodes passed in as props, so this client
 * component only decides visibility: an inactive panel gets `md:hidden`
 * (hidden on desktop, still in the phone scroll) — nothing refetches on tab
 * switch. The active tab is mirrored into the URL hash (replaceState, no
 * history entry) so a link to #stories opens that tab.
 */
export function ProfileTabs({ panels }: { panels: ProfilePanel[] }) {
  const t = useTranslations("profile");
  const hash = useSyncExternalStore(subscribeToHash, readHash, () => "");
  // A tab clicked in this session wins; until then the URL hash (a shared
  // link to #stories) picks the tab, falling back to the first panel.
  const [picked, setPicked] = useState<string | null>(null);
  const active =
    picked ?? (panels.some((p) => p.id === hash) ? hash : panels[0]?.id);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  // An in-page link to an anchor inside a panel («#family» from a Линия
  // жизни card) must open that panel even after a tab was clicked — the
  // browser can't scroll to an element inside a hidden panel on its own,
  // so switch first, then scroll once it's visible.
  useEffect(() => {
    const onHashChange = () => {
      const id = readHash();
      const target = id ? document.getElementById(id) : null;
      const panel = target?.closest<HTMLElement>('[role="tabpanel"]');
      if (!target || !panel) return;
      setPicked(panel.id);
      if (panel !== target) {
        requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const select = (id: string) => {
    setPicked(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = panels.findIndex((p) => p.id === active);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = panels[(index + step + panels.length) % panels.length];
    select(next.id);
    tabRefs.current.get(next.id)?.focus();
  };

  return (
    <>
      {/* -mt-9: tabs and content ride ~36px up over the hero's faded
          bottom (user request 2026-09-26). */}
      <div className="sticky top-[calc(var(--app-header-h,0px)-0.75rem)] z-30 -mt-9 flex justify-center px-4 pt-6 md:pt-8">
        <ProfileTabList
          panels={panels}
          active={active}
          label={t("sections")}
          onSelect={select}
          onKeyDown={onKeyDown}
          tabRefs={tabRefs}
        />

        <div className="md:hidden">
          <ContentsMenu
            menuId="profile-contents"
            menuLabel={t("sections")}
            items={panels.map((panel) => ({
              id: panel.id,
              label: panel.label,
              aside: panel.count || undefined,
            }))}
          />
        </div>
      </div>

      {panels.map((panel) => (
        <div
          key={panel.id}
          id={panel.id}
          role="tabpanel"
          aria-labelledby={`tab-${panel.id}`}
          className={`scroll-mt-[calc(var(--app-header-h,0px)+4.5rem)] ${panel.id === active ? "" : "md:hidden"}`}
        >
          {panel.content}
        </div>
      ))}
    </>
  );
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash() {
  return window.location.hash.slice(1);
}
