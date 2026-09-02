import { TreeCanvas } from "@/components/tree-v2/tree-canvas";
import { focusPersonId, initialFamilyGraph } from "@/domain/tree-v2/fixture";

/**
 * Изолированная песочница для tree-v2 — новой реализации семейного дерева
 * "с чистого листа". Без auth/family/slug, без БД: чистый fixture-граф,
 * который пополняется по ходу диалога. Не связана с production роутом
 * /families/[slug]/tree и со старым src/domain/tree.
 */
export default function TreeV2DevPage() {
  return (
    <TreeCanvas graph={initialFamilyGraph} focusPersonId={focusPersonId} />
  );
}
