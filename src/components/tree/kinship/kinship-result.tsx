"use client";

import { useLocale } from "next-intl";
import type { KinshipSummary } from "@/domain/relationship/kinship-terms";
import { personDisplayName } from "@/domain/person/display-name";
import type { TreePersonClientPayload } from "@/domain/tree/tree-adapter";
import { KinshipPath } from "./kinship-path";
import type { KinshipTrace } from "./use-kinship-trace";

/**
 * The answer: the pair's kinship as a heading ("Троюродные сёстры"), each
 * side's own term when they differ, then the path itself. Rendered only
 * once both people are chosen.
 */
export function KinshipResult({
  summary,
  stops,
  personA,
  personB,
  personsById,
  familyId,
  onPanTo,
}: {
  summary: KinshipSummary;
  stops: KinshipTrace["stops"];
  personA: TreePersonClientPayload;
  personB: TreePersonClientPayload;
  personsById: KinshipTrace["personsById"];
  familyId: string;
  onPanTo: (personId: string) => void;
}) {
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1" aria-live="polite">
        <h3 className="font-heading text-2xl leading-tight font-medium text-balance">
          {summary.headline}
        </h3>
        {summary.roles && (
          <p className="text-sm text-muted-foreground">
            {personDisplayName(personA, locale)} — {summary.roles.a}
            <br />
            {personDisplayName(personB, locale)} — {summary.roles.b}
          </p>
        )}
        {summary.detail && (
          <p className="text-sm text-muted-foreground">{summary.detail}</p>
        )}
      </div>
      {stops.length > 1 && (
        <KinshipPath
          stops={stops}
          personsById={personsById}
          familyId={familyId}
          onPanTo={onPanTo}
        />
      )}
    </div>
  );
}
