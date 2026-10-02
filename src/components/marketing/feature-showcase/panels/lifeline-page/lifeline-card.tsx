import Image from "next/image";
import { PencilIcon } from "lucide-react";
import { glassSurface } from "@/components/hero/glass";

/**
 * LifelineEventCard as plain markup (lifeline-event-card.tsx +
 * lifeline-fact-people.tsx): the terracotta year line, the event's serif
 * title with the pencil level with the year, type · date · place, the
 * story, and under a hairline who took part — face and name.
 */
export function LifelineCard({
  kicker,
  title,
  details,
  text,
  peopleLabel,
  person,
}: {
  kicker: string;
  title: string;
  details: string;
  text: string;
  peopleLabel: string;
  person: { name: string; photo: string };
}) {
  return (
    <div className={`${glassSurface} flex flex-col gap-4 rounded-[20px] p-5`}>
      <span className="text-sm text-primary tabular-nums">{kicker}</span>
      <div className="-mt-3 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-heading text-[1.4rem] leading-tight font-normal text-balance">
              {title}
            </p>
            <span className="text-sm text-foreground/55">{details}</span>
            <p className="mt-1 max-w-[54ch] text-foreground/65">{text}</p>
          </div>
          <span className="-mt-6 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-glass-edge bg-glass text-foreground [&_svg]:size-3.5">
            <PencilIcon />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-glass-edge pt-3 text-sm">
          <span className="text-xs font-medium text-foreground/50">
            {peopleLabel}:
          </span>
          <span className="flex items-center gap-2">
            <span className="relative size-7 shrink-0 overflow-hidden rounded-[9px] bg-glass-strong ring-1 ring-tree-accent">
              <Image
                src={person.photo}
                alt=""
                fill
                sizes="28px"
                className="object-cover object-[50%_25%]"
              />
            </span>
            <span className="text-foreground/85">{person.name}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
