"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowDownIcon, ArrowUpIcon, HeartHandshakeIcon } from "lucide-react";
import { personDisplayName } from "@/domain/person/display-name";
import type { KinshipPathStop } from "@/domain/relationship/kinship-terms";
import { KinshipAvatar } from "./kinship-avatar";
import type { KinshipTrace } from "./use-kinship-trace";

const VIA_ICON = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  partner: HeartHandshakeIcon,
} as const;

const VIA_LABEL = {
  up: "viaUp",
  down: "viaDown",
  partner: "viaPartner",
} as const;

function stopRole(
  stop: KinshipPathStop,
  t: ReturnType<typeof useTranslations<"kinship">>,
): string {
  if (stop.via === null) return t("pathStart");
  const role = stop.role ?? "";
  return stop.isCommonAncestor ? t("commonAncestor", { role }) : role;
}

/**
 * The traced path, person by person, from A to B. Each stop is a button
 * that pans the tree to that card. Desktop: a vertical list along a
 * terracotta rail, with the step direction on the right. Touch: one
 * horizontal chain, so the bottom sheet stays short.
 */
export function KinshipPath({
  stops,
  personsById,
  familyId,
  onPanTo,
}: {
  stops: KinshipPathStop[];
  personsById: KinshipTrace["personsById"];
  familyId: string;
  onPanTo: (personId: string) => void;
}) {
  const t = useTranslations("kinship");
  const locale = useLocale();
  const entries = stops.flatMap((stop) => {
    const person = personsById.get(stop.personId);
    return person ? [{ stop, person }] : [];
  });

  return (
    <>
      <ol
        aria-label={t("path")}
        className="relative hidden flex-col md:pointer-fine:flex"
      >
        <span
          aria-hidden
          className="absolute top-5 bottom-5 left-[1.3rem] w-0.5 rounded-full bg-primary/50"
        />
        {entries.map(({ stop, person }) => {
          const Icon = stop.via ? VIA_ICON[stop.via] : null;
          return (
            <li key={stop.personId}>
              <button
                type="button"
                onClick={() => onPanTo(stop.personId)}
                className="relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1.5 text-left transition-colors duration-fast ease-(--ease-reveal) outline-none hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <KinshipAvatar
                  person={person}
                  familyId={familyId}
                  isCommonAncestor={stop.isCommonAncestor}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {personDisplayName(person, locale)}
                  </span>
                  <span
                    className={
                      stop.isCommonAncestor
                        ? "text-xs font-medium text-primary"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {stopRole(stop, t)}
                  </span>
                </span>
                {Icon && stop.via && (
                  <Icon
                    aria-label={t(VIA_LABEL[stop.via])}
                    className="size-3.5 shrink-0 fill-none! text-muted-foreground"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <ol
        aria-label={t("path")}
        className="-mx-1 flex overflow-x-auto overscroll-x-contain pb-1 md:pointer-fine:hidden"
      >
        {entries.map(({ stop, person }, index) => (
          <li key={stop.personId} className="relative w-18 shrink-0">
            {index < entries.length - 1 && (
              <span
                aria-hidden
                className="absolute top-4 left-1/2 h-0.5 w-full bg-primary/50"
              />
            )}
            <button
              type="button"
              onClick={() => onPanTo(stop.personId)}
              className="relative flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg px-1 pb-1 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-primary/10"
            >
              <KinshipAvatar
                person={person}
                familyId={familyId}
                isCommonAncestor={stop.isCommonAncestor}
              />
              <span className="w-full truncate text-xs font-medium">
                {person.firstName ?? personDisplayName(person, locale)}
              </span>
              <span
                className={
                  stop.isCommonAncestor
                    ? "line-clamp-2 text-[0.65rem] leading-tight font-medium text-primary"
                    : "line-clamp-2 text-[0.65rem] leading-tight text-muted-foreground"
                }
              >
                {stop.via === null ? t("start") : stop.role}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
