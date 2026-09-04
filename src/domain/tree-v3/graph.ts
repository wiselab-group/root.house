import type {
  FamilyGraph,
  NormalizedGraph,
  NormalizedPerson,
  Partnership,
  Person,
  SoloParent,
} from "./types";
import { shouldBeLeft } from "./subtree";

/**
 * tree-v3 — построение NormalizedGraph из "сырого" FamilyGraph (§31).
 * НЕ мутирует исходный граф. Не знает про React/xyflow/БД.
 *
 * Ключевое отличие от tree-v2/layout.ts: там все супруги одного человека
 * схлопывались в один "unit" (что ломало §19/§20 ремарьяж — дети от двух
 * браков оказывались в одном юните без различения партнёрства). Здесь
 * Partnership строится ОДИН на каждый spouse-relationship — человек может
 * состоять в нескольких Partnership одновременно (§16/§17), и дети каждого
 * брака принадлежат СВОЕМУ Partnership (§21).
 */
export function normalizeGraph(
  graph: FamilyGraph,
  focusPersonId: string,
): NormalizedGraph {
  const rawPersonById = new Map(graph.persons.map((p) => [p.id, p]));
  if (!rawPersonById.has(focusPersonId)) {
    throw new Error(
      `normalizeGraph: focus person "${focusPersonId}" not found in graph`,
    );
  }

  // --- Partnerships: один per spouse relationship, husband-left/wife-right (§9). ---
  const partnershipById = new Map<string, Partnership>();
  const partnershipIdsByPerson = new Map<string, string[]>();
  for (const rel of graph.relationships) {
    if (rel.kind !== "spouse") continue;
    const a = rawPersonById.get(rel.from);
    const b = rawPersonById.get(rel.to);
    if (!a || !b) continue; // не корраптим граф молча, но и не падаем — §32.

    const [leftPersonId, rightPersonId] = orderSpouses(a, b);
    const partnership: Partnership = {
      id: rel.id,
      leftPersonId,
      rightPersonId,
      childrenIds: [],
    };
    partnershipById.set(partnership.id, partnership);
    pushMulti(partnershipIdsByPerson, leftPersonId, partnership.id);
    pushMulti(partnershipIdsByPerson, rightPersonId, partnership.id);
  }

  // --- parent-child: собираем родителей каждого ребёнка. ---
  const parentIdsByChild = new Map<string, string[]>();
  for (const rel of graph.relationships) {
    if (rel.kind !== "parent-child") continue;
    if (!rawPersonById.has(rel.from) || !rawPersonById.has(rel.to)) continue;
    pushMulti(parentIdsByChild, rel.to, rel.from);
  }

  // --- Приписываем каждого ребёнка к его Partnership (§21), либо к SoloParent,
  // если второй родитель не установлен графом или пара не в браке в этом графе. ---
  const soloParentByPersonId = new Map<string, SoloParent>();
  for (const [childId, parentIds] of parentIdsByChild) {
    const partnershipId = findPartnershipFor(
      parentIds,
      partnershipById,
      partnershipIdsByPerson,
    );
    if (partnershipId) {
      partnershipById.get(partnershipId)!.childrenIds.push(childId);
      continue;
    }
    // Нет общего partnership — каждый parentId получает ребёнка как SoloParent
    // (не теряем связь, просто не можем нарисовать "junction" двух супругов).
    for (const parentId of parentIds) {
      if (!soloParentByPersonId.has(parentId)) {
        soloParentByPersonId.set(parentId, {
          personId: parentId,
          childrenIds: [],
        });
      }
      const solo = soloParentByPersonId.get(parentId)!;
      if (!solo.childrenIds.includes(childId)) solo.childrenIds.push(childId);
    }
  }

  // --- Generation: BFS soft hint от фокуса, через parent-child И spouse edges
  // (супруг человека — то же поколение, даже если сам по себе не входит в
  // parent-child цепочку до фокуса) — §14: soft y-hint, не жёсткая ось.
  const generationByPerson = computeGenerations(
    focusPersonId,
    graph,
    rawPersonById,
  );

  // --- Branch: paternal/maternal направление (§7/§8) — по тому, через отца
  // или мать фокуса пролегает путь до этого человека. Мягкая подсказка. ---
  const branchByPerson = computeBranches(
    focusPersonId,
    parentIdsByChild,
    rawPersonById,
  );

  const personById = new Map<string, NormalizedPerson>();
  for (const p of graph.persons) {
    personById.set(p.id, {
      ...p,
      generation: generationByPerson.get(p.id) ?? 0,
      partnershipIds: partnershipIdsByPerson.get(p.id) ?? [],
      parentIds: parentIdsByChild.get(p.id) ?? [],
      branch: branchByPerson.get(p.id) ?? "unknown",
    });
  }

  return {
    personById,
    partnershipById,
    soloParentByPersonId,
    relationships: graph.relationships,
    focusPersonId,
  };
}

/** Husband-first (§9) — тонкая обёртка над общей subtree.ts::shouldBeLeft (единственная реализация husband-left/wife-right ranking+tie-break во всём tree-v3, см. её комментарий). */
function orderSpouses(a: Person, b: Person): [string, string] {
  return shouldBeLeft(a.gender, b.gender, a.id, b.id)
    ? [a.id, b.id]
    : [b.id, a.id];
}

function pushMulti<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  if (!map.has(key)) map.set(key, []);
  const arr = map.get(key)!;
  if (!arr.includes(value)) arr.push(value);
}

/** Находит Partnership, в котором участвуют ВСЕ parentIds (обычно 2) — единственный общий partnership двух людей. */
function findPartnershipFor(
  parentIds: string[],
  partnershipById: Map<string, Partnership>,
  partnershipIdsByPerson: Map<string, string[]>,
): string | null {
  if (parentIds.length < 2) return null;
  const [first, ...rest] = parentIds;
  const candidates = partnershipIdsByPerson.get(first) ?? [];
  for (const candidateId of candidates) {
    const partnership = partnershipById.get(candidateId)!;
    const members = new Set([
      partnership.leftPersonId,
      partnership.rightPersonId,
    ]);
    if (rest.every((id) => members.has(id)) && members.has(first)) {
      return candidateId;
    }
  }
  return null;
}

/**
 * BFS от фокуса по неориентированному графу (parent-child ходит и вверх, и
 * вниз; spouse — горизонтально, generation delta 0). Несвязанные компоненты
 * графа получают generation 0 по умолчанию (не должны существовать в
 * валидных данных, но не роняем layout — §32).
 */
function computeGenerations(
  focusPersonId: string,
  graph: FamilyGraph,
  personById: Map<string, Person>,
): Map<string, number> {
  const generation = new Map<string, number>([[focusPersonId, 0]]);
  const queue: string[] = [focusPersonId];

  // Соседи с дельтой поколения: parent (from) видит child (to) на +1;
  // child видит parent на -1; спутники (spouse) — на 0.
  const neighbors = new Map<string, { id: string; delta: number }[]>();
  const addNeighbor = (from: string, to: string, delta: number) => {
    if (!neighbors.has(from)) neighbors.set(from, []);
    neighbors.get(from)!.push({ id: to, delta });
  };
  for (const rel of graph.relationships) {
    if (!personById.has(rel.from) || !personById.has(rel.to)) continue;
    if (rel.kind === "parent-child") {
      addNeighbor(rel.from, rel.to, 1);
      addNeighbor(rel.to, rel.from, -1);
    } else {
      addNeighbor(rel.from, rel.to, 0);
      addNeighbor(rel.to, rel.from, 0);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentGen = generation.get(current)!;
    for (const { id, delta } of neighbors.get(current) ?? []) {
      if (generation.has(id)) continue;
      generation.set(id, currentGen + delta);
      queue.push(id);
    }
  }

  return generation;
}

/**
 * Отцовская/материнская ветка (§7/§8): проходим вверх от фокуса через
 * ПЕРВЫЙ шаг parentIds — если этот родитель мужчина → всё его поддерево
 * предков "paternal", если женщина → "maternal". Дальше распространяем
 * то же значение вниз (дядья/тёти, их дети и т.д. остаются на "своей"
 * стороне — §7 "The uncle/aunt branches... should preferably remain on the
 * paternal side"). Потомки самого фокуса — отдельная категория "descendant".
 */
function computeBranches(
  focusPersonId: string,
  parentIdsByChild: Map<string, string[]>,
  personById: Map<string, Person>,
): Map<string, "focus" | "paternal" | "maternal" | "descendant" | "unknown"> {
  const branch = new Map<
    string,
    "focus" | "paternal" | "maternal" | "descendant" | "unknown"
  >();
  branch.set(focusPersonId, "focus");

  // childIdsByParent — обратный индекс для распространения вниз к descendant/дядям-тётям.
  const childIdsByParent = new Map<string, string[]>();
  for (const [childId, parentIds] of parentIdsByChild) {
    for (const parentId of parentIds)
      pushMulti(childIdsByParent, parentId, childId);
  }

  // 1) Прямые потомки фокуса → "descendant" (BFS вниз).
  const descQueue = [...(childIdsByParent.get(focusPersonId) ?? [])];
  while (descQueue.length > 0) {
    const id = descQueue.shift()!;
    if (branch.has(id)) continue;
    branch.set(id, "descendant");
    descQueue.push(...(childIdsByParent.get(id) ?? []));
  }

  // 2) Родители фокуса определяют paternal/maternal корень, дальше — вверх
  // (их родители) и вбок (их сиблинги и потомки сиблингов) тем же значением.
  //
  // Направление по умолчанию — позиционное (parentIds[0] → paternal,
  // parentIds[1] → maternal, порядок из графа), а НЕ "gender !== female
  // значит paternal": если ОБА родителя имеют неизвестный/одинаковый gender
  // (§32 — валидные, но неполные данные), чистый gender-tiebreak дал бы
  // ОБОИМ "paternal" — не создавая расхождения вообще (см. историю бага:
  // синтетический CASE C без явных gender'ов давал father=mother=paternal,
  // и layout никогда не заходил в diverging-fork ветку). Explicit female
  // ПЕРЕВЕШИВАЕТ позиционный дефолт (реальные данные почти всегда с
  // известным gender — см. fixture.ts), но при неизвестности обе стороны
  // ОБЯЗАНЫ разойтись, иначе конструктивная гарантия §7/§8 (paternal left/
  // maternal right) не работает в принципе.
  const focusParents = parentIdsByChild.get(focusPersonId) ?? [];
  focusParents.forEach((parentId, index) => {
    const person = personById.get(parentId);
    const positionalSide: "paternal" | "maternal" =
      index === 0 ? "paternal" : "maternal";
    const side: "paternal" | "maternal" =
      person?.gender === "female"
        ? "maternal"
        : person?.gender === "male"
          ? "paternal"
          : positionalSide;
    floodBranch(parentId, side);
  });

  return branch;

  /** Распространяет `side` вверх (родители) и вбок (сиблинги + их потомки), не трогая уже помеченные узлы (focus/descendant главнее). */
  function floodBranch(startId: string, side: "paternal" | "maternal"): void {
    // Каждый элемент очереди несёт "разрешено ли отсюда подниматься к
    // родителям" — только узлы, достигнутые ВВЕРХ (сам startId, и предки),
    // могут продолжать подниматься. Узлы, достигнутые ВБОК/ВНИЗ (сиблинги
    // startId и их дети, дети самого startId) — НЕ поднимаются к своим
    // родителям: для расшаренного ребёнка (Дарья — общий ребёнок Виктора и
    // Галины) подъём привёл бы прямо к ВТОРОМУ родителю (Галине) и покрасил
    // бы всю материнскую сторону как отцовскую (см. историю бага: floodBranch
    // добирался до galina-kupchik/nikolai-kozlovsky через
    // parentIdsByChild.get(darya) внутри "вверх"-шага).
    const queue: { id: string; canAscend: boolean }[] = [
      { id: startId, canAscend: true },
    ];
    while (queue.length > 0) {
      const { id, canAscend } = queue.shift()!;
      if (branch.has(id)) continue;
      branch.set(id, side);

      if (canAscend) {
        // Вверх: собственные родители (продолжают подниматься дальше).
        for (const parentId of parentIdsByChild.get(id) ?? []) {
          queue.push({ id: parentId, canAscend: true });
        }
        // Вбок: сиблинги (другие дети тех же родителей) — сами МОГУТ
        // подниматься (если у них общий родитель ещё не размещён предком
        // startId — на практике это уже те же самые родители, ascend
        // оттуда просто повторно посетит уже branch.has() узел).
        for (const parentId of parentIdsByChild.get(id) ?? []) {
          for (const siblingId of childIdsByParent.get(parentId) ?? []) {
            queue.push({ id: siblingId, canAscend: true });
          }
        }
      }

      // Вниз: собственные дети — остаются на той же стороне (§7 uncle/aunt
      // branches), но НЕ поднимаются через своего (возможно, "чужого")
      // второго родителя.
      for (const childId of childIdsByParent.get(id) ?? []) {
        queue.push({ id: childId, canAscend: false });
      }
    }
  }
}
