import { TreeCanvas } from "@/components/tree-v4/tree-canvas";
import { focusPersonId, initialFamilyGraph } from "@/domain/tree-v4/fixture";

/**
 * Isolated dev sandbox — no auth/family/slug/DB dependency, same pattern as
 * /dev/tree-v2 and /dev/tree-v3. Uses only the in-memory fixture graph
 * (Alexander/Eleonora/Eva — the real data minimal core, see
 * src/domain/tree-v4/fixture.ts). Independent of both tree-v2 and tree-v3;
 * neither route nor either implementation is touched by this one.
 */
export default function TreeV4DevPage() {
  return (
    <TreeCanvas graph={initialFamilyGraph} focusPersonId={focusPersonId} />
  );
}
