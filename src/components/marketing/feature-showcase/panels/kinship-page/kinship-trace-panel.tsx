import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  HeartHandshakeIcon,
  RouteIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KinshipPathStop } from "@/domain/relationship/kinship-terms";

export interface TracePerson {
  name: string;
  initials: string;
  photo?: string;
}

const VIA_ICON = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  partner: HeartHandshakeIcon,
} as const;

/** A filled PersonCombobox (person-picker-input.tsx) as plain markup. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="relative flex h-11 items-center rounded-lg border border-input">
        <SearchIcon className="absolute left-3.5 size-4 text-muted-foreground" />
        <span className="truncate pr-9 pl-10 text-sm">{value}</span>
        <XIcon className="absolute right-3 size-4 text-muted-foreground" />
      </span>
    </div>
  );
}

/** KinshipAvatar: terracotta-ringed, the common ancestor filled and haloed. */
function Avatar({
  person,
  ancestor,
}: {
  person: TracePerson;
  ancestor: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-muted text-[0.65rem] font-semibold text-muted-foreground",
        ancestor && "bg-primary text-primary-foreground ring-4 ring-primary/25",
      )}
    >
      {person.photo ? (
        <Image
          src={person.photo}
          alt=""
          fill
          sizes="32px"
          className="object-cover"
        />
      ) : (
        person.initials
      )}
    </span>
  );
}

/**
 * The tree's «Родство» panel at desktop size (kinship-panel.tsx,
 * kinship-slots.tsx, kinship-result.tsx, kinship-path.tsx): both people
 * picked, the answer, each side's term, the path person by person along
 * the terracotta rail with the step's direction, and the steps count.
 */
export function KinshipTracePanel({
  a,
  b,
  headline,
  roles,
  stops,
  personOf,
}: {
  a: TracePerson;
  b: TracePerson;
  headline: string;
  roles: { a: string; b: string } | null;
  stops: KinshipPathStop[];
  personOf: (id: string) => TracePerson;
}) {
  const t = useTranslations("kinship");
  const count = (via: KinshipPathStop["via"]) =>
    stops.filter((s) => s.via === via).length;
  const steps = t("steps", {
    count: stops.length - 1,
    parts: [
      count("up") && t("stepsUp", { count: count("up") }),
      count("down") && t("stepsDown", { count: count("down") }),
    ]
      .filter(Boolean)
      .join(", "),
  });

  return (
    <div className="absolute top-3 left-3 flex w-84 flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-heading text-lg font-medium">
          <RouteIcon className="size-4.5 text-primary" />
          {t("title")}
        </span>
        <XIcon className="mr-1.5 size-4" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Field label={t("first")} value={a.name} />
          <Field label={t("second")} value={b.name} />
        </div>
        <span className="mt-7 inline-flex size-8 items-center justify-center rounded-lg border border-border bg-input/30">
          <ArrowUpDownIcon className="size-4" />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-heading text-2xl leading-tight font-medium">
          {headline}
        </span>
        {roles && (
          <span className="text-sm text-muted-foreground">
            {a.name} — {roles.a}
            <br />
            {b.name} — {roles.b}
          </span>
        )}
      </div>
      <ol className="relative flex flex-col">
        <span className="absolute top-5 bottom-5 left-[1.3rem] w-0.5 rounded-full bg-primary/50" />
        {stops.map((stop) => {
          const person = personOf(stop.personId);
          const Icon = stop.via ? VIA_ICON[stop.via] : null;
          return (
            <li
              key={stop.personId}
              className="relative flex items-center gap-3 px-1.5 py-1.5"
            >
              <Avatar person={person} ancestor={stop.isCommonAncestor} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {person.name}
                </span>
                <span
                  className={
                    stop.isCommonAncestor
                      ? "text-xs font-medium text-primary"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {stop.via === null
                    ? t("pathStart")
                    : stop.isCommonAncestor
                      ? t("commonAncestor", { role: stop.role ?? "" })
                      : stop.role}
                </span>
              </span>
              {Icon && <Icon className="size-3.5 text-muted-foreground" />}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {steps}
        </span>
        <span className="rounded-md px-2.5 py-1 text-sm font-medium">
          {t("reset")}
        </span>
      </div>
    </div>
  );
}
