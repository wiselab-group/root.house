import { TreeCanvas } from "@/components/tree-v3/tree-canvas";
import { focusPersonId, initialFamilyGraph } from "@/domain/tree-v3/fixture";

/**
 * Изолированная песочница для tree-v3 — независимой генеалогической
 * layout-реализации (§38: не зависит от tree-v2 layout-кода, только от
 * реальных данных, перенесённых дословно — см. domain/tree-v3/fixture.ts).
 * Без auth/family/slug, без БД — та же fixture-first модель, что и tree-v2.
 * Не связана ни с production-роутом /families/[slug]/tree, ни с /dev/tree-v2.
 */
export default function TreeV3DevPage() {
  return (
    <TreeCanvas graph={initialFamilyGraph} focusPersonId={focusPersonId} />
  );
}
