import { useLocale } from "next-intl";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import { ScaledCanvas } from "@/components/marketing/shared/scaled-canvas";
import { PanelFrame } from "./panel-frame";
import { demoKinship } from "./kinship-page/kinship-demo";
import {
  KinshipTracePanel,
  type TracePerson,
} from "./kinship-page/kinship-trace-panel";
import { KinshipTree } from "./kinship-page/kinship-tree";
import { KinshipDock } from "./kinship-page/kinship-dock";

/** Narrow enough that, scaled to the panel, the text stays readable. */
const WIDTH = 840;
const HEIGHT = 630;
/** The tree beside the panel, zoomed out as when a trace frames its whole
 *  path. */
const TREE_ZOOM = 0.74;

const PHOTOS: Partial<Record<DemoPersonId, string>> = {
  ivan: LANDING_PHOTOS.ivanPortrait.src,
  vera: LANDING_PHOTOS.veraPortrait.src,
};

/**
 * The family tree with its «Родство» panel open, as the app draws it: you
 * and your uncle picked, the answer the app's own Relationship Trace gives
 * («Племянник и дядя»), the path through your mother and grandfather, the
 * same path marching in terracotta on the tree beside it, and the tool
 * dock carrying the answer.
 */
export function KinshipPanel() {
  const locale = useLocale();
  const family = useDemoFamily();
  const { summary, stops } = demoKinship("owen", "paul", locale);
  const personOf = (id: string): TracePerson => {
    const person = family[id as DemoPersonId];
    return {
      name: person.name,
      initials: person.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2),
      photo: PHOTOS[id as DemoPersonId],
    };
  };
  return (
    <PanelFrame className="bg-tree-canvas p-0">
      <ScaledCanvas width={WIDTH} height={HEIGHT}>
        <div
          className="absolute top-8 right-4 origin-top-right"
          style={{ scale: TREE_ZOOM }}
        >
          <KinshipTree path={stops.map((s) => s.personId as DemoPersonId)} />
        </div>
        <div className="absolute right-0 bottom-4 left-87 flex justify-center">
          <KinshipDock headline={summary.headline} />
        </div>
        <KinshipTracePanel
          a={personOf("owen")}
          b={personOf("paul")}
          headline={summary.headline}
          roles={summary.roles}
          stops={stops}
          personOf={personOf}
        />
      </ScaledCanvas>
    </PanelFrame>
  );
}
