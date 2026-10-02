"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LANDING_ANCHORS } from "./landing-anchors";

const ITEM =
  "block rounded-md px-3 py-2.5 text-sm text-foreground transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-accent focus-visible:bg-accent";

/** The header's in-page links, log in and language on phones and tablets —
 *  one small menu next to the always-visible "Start". */
export function MarketingMobileMenu() {
  const t = useTranslations("landing.nav");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("menu")}
        className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-95 lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <nav aria-label={t("label")}>
          <ul>
            {LANDING_ANCHORS.map(({ id, href }) => (
              <li key={id}>
                <a href={href} onClick={close} className={ITEM}>
                  {t(id)}
                </a>
              </li>
            ))}
            <li className="sm:hidden">
              <Link href="/login" onClick={close} className={ITEM}>
                {t("logIn")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mt-1 border-t border-border px-3 pt-2.5 pb-1">
          <LocaleSwitcher />
        </div>
      </PopoverContent>
    </Popover>
  );
}
