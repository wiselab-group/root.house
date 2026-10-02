import { buildGenealogyGraph } from "@/domain/relationship/genealogy-graph";
import { findRelationshipPath } from "@/domain/relationship/genealogy-algorithms";
import {
  describeKinship,
  describePathStops,
  type KinGender,
  type KinshipPathStop,
  type KinshipSummary,
} from "@/domain/relationship/kinship-terms";
import type { Locale } from "@/domain/shared/locale";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

const GENDER: Record<DemoPersonId, KinGender> = {
  ivan: "male",
  vera: "female",
  paul: "male",
  margaret: "female",
  david: "male",
  owen: "male",
  lily: "female",
  kid: "male",
};

const parent = (parentId: DemoPersonId, childId: DemoPersonId) => ({
  parentId,
  childId,
  parentRole: "biological" as const,
});

/** The landing's fictional family as the graph the tree traces over. */
const GRAPH = buildGenealogyGraph(
  (Object.keys(GENDER) as DemoPersonId[]).map((id) => ({ id })),
  [
    parent("ivan", "paul"),
    parent("vera", "paul"),
    parent("ivan", "margaret"),
    parent("vera", "margaret"),
    parent("margaret", "owen"),
    parent("david", "owen"),
    parent("margaret", "lily"),
    parent("david", "lily"),
    parent("owen", "kid"),
  ],
  [
    { person1Id: "ivan", person2Id: "vera" },
    { person1Id: "margaret", person2Id: "david" },
  ],
);

/**
 * «Кем мне приходится Павел?» answered by the app's own Relationship
 * Trace (findRelationshipPath + describeKinship/describePathStops, the
 * same calls use-kinship-trace.ts makes), so the words on the landing are
 * exactly the product's.
 */
export function demoKinship(
  a: DemoPersonId,
  b: DemoPersonId,
  locale: Locale,
): { summary: KinshipSummary; stops: KinshipPathStop[] } {
  const outcome = findRelationshipPath(GRAPH, a, b);
  const genderOf = (id: string) => GENDER[id as DemoPersonId] ?? "unknown";
  return {
    summary: describeKinship(outcome, genderOf, locale),
    stops:
      outcome.status === "found"
        ? describePathStops(outcome, genderOf, locale)
        : [],
  };
}
