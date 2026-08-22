import { db } from "@/db/client";
import { relationshipsParentChild, relationshipsPartnership } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listPersonsByFamily } from "@/domain/person/person.repository";
import { buildFocusTreeLayout, type PersonNode } from "./tree-layout.builder";
import type { TreeLayoutGraph } from "./tree-layout.builder";

/**
 * Assembles a family's full Person+Relationship graph and runs it through
 * buildFocusTreeLayout(). This is the only place that bridges the database
 * to the (library-agnostic) layout builder — components/tree/* never touch
 * the database directly.
 */
export async function getFocusTreeLayout(
  familyId: string,
  focusPersonId: string,
): Promise<TreeLayoutGraph> {
  const [persons, parentChildRows, partnershipRows] = await Promise.all([
    listPersonsByFamily(familyId),
    db.query.relationshipsParentChild.findMany({
      where: eq(relationshipsParentChild.familyId, familyId),
      columns: { parentId: true, childId: true },
    }),
    db.query.relationshipsPartnership.findMany({
      where: eq(relationshipsPartnership.familyId, familyId),
      columns: { person1Id: true, person2Id: true, isCurrent: true },
    }),
  ]);

  const personNodes: PersonNode[] = persons.map((p) => ({
    id: p.id,
    slug: p.slug,
    firstName: p.firstName,
    lastName: p.lastName,
    nickname: p.nickname,
    isPlaceholder: p.isPlaceholder,
    isLiving: p.isLiving,
    birthYear: p.birthDate?.year ?? null,
    deathYear: p.deathDate?.year ?? null,
  }));

  return buildFocusTreeLayout({
    persons: personNodes,
    parentChildEdges: parentChildRows,
    partnershipEdges: partnershipRows,
    focusPersonId,
  });
}
