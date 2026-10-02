import Image from "next/image";
import { useTranslations } from "next-intl";
import { BookOpen, Mic } from "lucide-react";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";

const CHIP =
  "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground";

/** Step 1: you, with your parents' places waiting above you. */
export function PeopleVisual() {
  const t = useTranslations("landing.how");
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3">
        {[t("addMother"), t("addFather")].map((label) => (
          <span
            key={label}
            className="rounded-xl border border-dashed border-muted-foreground/40 px-3 py-2 text-xs text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <span className="h-4 w-px bg-branch" />
      <div className="@container w-20">
        <MiniPersonCard name={t("you")} active />
      </div>
    </div>
  );
}

/** Step 2: a photo, a story and a voice recording on someone's page. */
export function MemoriesVisual() {
  const t = useTranslations("landing.how");
  return (
    <div className="flex w-full items-center gap-3">
      <div className="relative aspect-[3/4] w-24 shrink-0 -rotate-3 overflow-hidden rounded-sm bg-paper p-1.5 shadow-md">
        <div className="relative size-full overflow-hidden rounded-[2px]">
          <Image
            src={LANDING_PHOTOS.stroll.src}
            alt=""
            fill
            sizes="96px"
            className="object-cover sepia-25"
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <span className={CHIP}>{t("photo")}</span>
        <span className={CHIP}>
          <BookOpen className="size-3.5 text-muted-foreground" />
          <span className="truncate">{t("story")}</span>
        </span>
        <span className={CHIP}>
          <Mic className="size-3.5 text-muted-foreground" />
          <span className="truncate">{t("voice")}</span>
        </span>
      </div>
    </div>
  );
}

/** Step 3: an invitation going out, and relatives already adding things. */
export function FamilyVisual() {
  const t = useTranslations("landing.how");
  const family = useDemoFamily();
  const feed = [
    { who: family.margaret.name[0], text: t("joined") },
    { who: family.paul.name[0], text: t("added") },
  ];
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pl-3 text-xs">
        <span className="flex-1 text-muted-foreground">{t("invite")}</span>
        <span className="rounded-lg bg-primary px-2.5 py-1.5 font-medium text-primary-foreground">
          {t("inviteButton")}
        </span>
      </div>
      {feed.map(({ who, text }) => (
        <div key={text} className="flex items-center gap-2 px-1 text-xs">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground">
            {who}
          </span>
          <span className="text-muted-foreground">{text}</span>
        </div>
      ))}
    </div>
  );
}
