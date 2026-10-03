import { surnameKey } from "@/domain/person/surname-key";

/**
 * Generations and root branches of a family, for the map's «Откуда мы».
 * Pure graph code over parent→child and partnership edges — the same
 * Person/Relationship graph the tree draws, read for a different question.
 */

export interface ParentChildEdge {
  parentId: string;
  childId: string;
}

export interface PartnerEdge {
  person1Id: string;
  person2Id: string;
}

/**
 * Generation rank per person: 0 for the oldest known ancestors, children one
 * below their deepest parent. A parentless in-law takes their partner's rank
 * (a grandmother who married in is not a «first generation» root). Ranks
 * only grow while relaxing, and are capped by the person count, so a
 * malformed cycle cannot loop forever.
 */
export function computeGenerations(
  personIds: readonly string[],
  parentChild: readonly ParentChildEdge[],
  partners: readonly PartnerEdge[],
): Map<string, number> {
  const ids = new Set(personIds);
  const parentsOf = new Map<string, string[]>();
  for (const e of parentChild) {
    if (!ids.has(e.parentId) || !ids.has(e.childId)) continue;
    const list = parentsOf.get(e.childId) ?? [];
    list.push(e.parentId);
    parentsOf.set(e.childId, list);
  }
  const partnersOf = new Map<string, string[]>();
  for (const e of partners) {
    if (!ids.has(e.person1Id) || !ids.has(e.person2Id)) continue;
    partnersOf.set(e.person1Id, [
      ...(partnersOf.get(e.person1Id) ?? []),
      e.person2Id,
    ]);
    partnersOf.set(e.person2Id, [
      ...(partnersOf.get(e.person2Id) ?? []),
      e.person1Id,
    ]);
  }

  const rank = new Map<string, number>(personIds.map((id) => [id, 0]));
  const cap = personIds.length;
  for (let pass = 0; pass <= cap; pass++) {
    let changed = false;
    for (const id of personIds) {
      const parents = parentsOf.get(id);
      let next = rank.get(id) ?? 0;
      if (parents) {
        for (const p of parents) next = Math.max(next, (rank.get(p) ?? 0) + 1);
      } else {
        for (const p of partnersOf.get(id) ?? []) {
          if (parentsOf.has(p)) next = Math.max(next, rank.get(p) ?? 0);
        }
      }
      next = Math.min(next, cap);
      if (next !== rank.get(id)) {
        rank.set(id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return rank;
}

export interface BranchPerson {
  id: string;
  lastName: string | null;
  maidenName: string | null;
  birthYear: number | null;
}

export interface FamilyBranch {
  /** The root person the branch is named after. */
  rootId: string;
  /** Every root of the branch — a founding couple shares one branch. */
  rootIds: string[];
  /** The founders' family name; null when they have none. */
  surname: string | null;
  /**
   * The branch's own line: the founders and the descendants born with their
   * family name. Where the name stops, the line has flowed into another one.
   */
  lineIds: string[];
  /** Roots + every descendant, by id — the branch's whole path to today. */
  memberIds: string[];
  /** Generations along the branch's own line. */
  generations: number;
  /** The branch whose line the children of this line were born into. */
  joinsRootId: string | null;
}

/**
 * The family's root branches: each parentless rank-0 person with all their
 * descendants. A founding couple counts once, and so do founders who share a
 * family name. Branches converge — an in-married line's grandchildren are the
 * main line's too — so a branch is named and ranked by its own line (the
 * founders' family name, carried by birth), not by all its descendants:
 * otherwise every line feeding into the biggest one looks like a copy of it.
 */
export function findBranches(
  persons: readonly BranchPerson[],
  parentChild: readonly ParentChildEdge[],
  partners: readonly PartnerEdge[],
  generations: ReadonlyMap<string, number>,
): FamilyBranch[] {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const keyOf = (id: string) => surnameKey(familyName(byId.get(id)));
  const hasParent = new Set<string>();
  const childrenOf = new Map<string, string[]>();
  for (const e of parentChild) {
    if (!byId.has(e.parentId) || !byId.has(e.childId)) continue;
    hasParent.add(e.childId);
    childrenOf.set(e.parentId, [
      ...(childrenOf.get(e.parentId) ?? []),
      e.childId,
    ]);
  }
  const roots = persons
    .map((p) => p.id)
    .filter((id) => !hasParent.has(id) && (generations.get(id) ?? 0) === 0);

  // Founding couples, and founders of one family name, share a branch.
  const groupOf = new Map<string, string>(roots.map((id) => [id, id]));
  const find = (id: string): string => {
    let cur = id;
    while (groupOf.get(cur) !== cur) cur = groupOf.get(cur) as string;
    return cur;
  };
  const join = (a: string, b: string) => groupOf.set(find(b), find(a));
  for (const e of partners) {
    if (groupOf.has(e.person1Id) && groupOf.has(e.person2Id))
      join(e.person1Id, e.person2Id);
  }
  const rootByKey = new Map<string, string>();
  for (const id of roots) {
    const key = keyOf(id);
    if (!key) continue;
    const seen = rootByKey.get(key);
    if (seen) join(seen, id);
    else rootByKey.set(key, id);
  }
  const groups = new Map<string, string[]>();
  for (const id of roots) {
    const g = find(id);
    groups.set(g, [...(groups.get(g) ?? []), id]);
  }

  const descend = (from: string[], keep: (id: string) => boolean) => {
    const found = new Set(from);
    const queue = [...from];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      for (const child of childrenOf.get(id) ?? []) {
        if (found.has(child) || !keep(child)) continue;
        found.add(child);
        queue.push(child);
      }
    }
    return found;
  };

  const branches: FamilyBranch[] = [];
  for (const rootIds of groups.values()) {
    const members = descend(rootIds, () => true);
    // Founders with nobody below are not a branch, just people.
    if (members.size === rootIds.length) continue;

    const rootId = founderOf(rootIds, members, byId, keyOf);
    const key = keyOf(rootId);
    const line = key ? descend(rootIds, (id) => keyOf(id) === key) : members;
    const ranks = [...line].map((id) => generations.get(id) ?? 0);
    branches.push({
      rootId,
      rootIds,
      surname: familyName(byId.get(rootId)),
      lineIds: [...line],
      memberIds: [...members],
      generations: Math.max(...ranks) - Math.min(...ranks) + 1,
      joinsRootId: null,
    });
  }

  // Where each line flows on: the biggest other line its children are in.
  const lineOf = new Map<string, FamilyBranch>();
  for (const b of branches) for (const id of b.lineIds) lineOf.set(id, b);
  for (const b of branches) {
    const lines = new Set(b.lineIds);
    let target: FamilyBranch | null = null;
    for (const id of b.lineIds) {
      for (const child of childrenOf.get(id) ?? []) {
        const other = lines.has(child) ? undefined : lineOf.get(child);
        if (other && other !== b && (!target || bigger(other, target)))
          target = other;
      }
    }
    b.joinsRootId = target?.rootId ?? null;
  }

  return branches.sort((a, b) =>
    bigger(a, b) ? -1 : bigger(b, a) ? 1 : a.rootId.localeCompare(b.rootId),
  );
}

/** Ranked by its own line first, then by everyone it led to. */
function bigger(a: FamilyBranch, b: FamilyBranch): boolean {
  return (
    a.lineIds.length > b.lineIds.length ||
    (a.lineIds.length === b.lineIds.length &&
      a.memberIds.length > b.memberIds.length)
  );
}

/** The founder whose family name the most of the branch was born with;
 *  the oldest founder on a tie or when nobody has a name. */
function founderOf(
  rootIds: string[],
  members: Set<string>,
  byId: Map<string, BranchPerson>,
  keyOf: (id: string) => string | null,
): string {
  const counts = new Map<string, number>();
  for (const id of members) {
    const key = keyOf(id);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ordered = rootIds
    .map((id) => byId.get(id))
    .filter((p): p is BranchPerson => Boolean(p))
    .sort(
      (a, b) =>
        (counts.get(keyOf(b.id) ?? "") ?? 0) -
          (counts.get(keyOf(a.id) ?? "") ?? 0) ||
        (a.birthYear ?? Infinity) - (b.birthYear ?? Infinity) ||
        a.id.localeCompare(b.id),
    );
  return ordered[0].id;
}

/** Birth family name: a maiden name when known, else the current one. */
function familyName(p: BranchPerson | undefined): string | null {
  return p?.maidenName?.trim() || p?.lastName?.trim() || null;
}
