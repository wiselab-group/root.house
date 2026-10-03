import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";

/**
 * Re-colours MapTiler's «dataviz» base style by ROLE — land, water, border,
 * label — so the family map wears the app's own palette instead of a
 * stock street map, and drops everything that isn't about the family
 * (roads below the major ones, rail, buildings, small-place labels). Pure:
 * colours come in already resolved (map-theme.ts reads them from CSS).
 */

export interface MapPalette {
  land: string;
  forest: string;
  water: string;
  waterShadow: string;
  road: string;
  border: string;
  countryBorder: string;
  label: string;
  labelHalo: string;
  waterLabel: string;
}

type Role = keyof MapPalette;

/** Layer id in «dataviz» → what it is. Anything not listed is hidden. */
const ROLES: Record<string, Role> = {
  Background: "land",
  Landcover: "land",
  Forest: "forest",
  River: "water",
  "Water shadow": "waterShadow",
  Water: "water",
  "Road network": "road",
  "Other border": "border",
  "Other border dash": "border",
  "Disputed border": "border",
  "Country border": "countryBorder",
  "Ocean labels": "waterLabel",
  "Sea labels": "waterLabel",
  "Lakeline labels": "waterLabel",
  "State labels": "label",
  "Town labels": "label",
  "City labels": "label",
  "Country labels": "label",
  "Continent labels": "label",
};

/**
 * Detail that only helps when placing a point by hand (a village, a road
 * name): painted like the rest but hidden until the map turns it on —
 * family map's edit mode (setDetailVisible).
 */
const DETAIL_ROLES: Record<string, Role> = {
  "Village labels": "label",
  "Place labels": "label",
  "Road labels": "label",
  Path: "road",
};
export const DETAIL_LAYER_IDS = Object.keys(DETAIL_ROLES);

/** Place labels that may name a family place — the map's own pin already does. */
const PLACE_LABELS = new Set(["Town labels", "City labels"]);

export interface ApplyOptions {
  locale: string;
  /** Names the map already shows on its own pins — the basemap stays quiet there. */
  hideLabelNames?: readonly string[];
}

function paintFor(
  layer: LayerSpecification,
  color: string,
  palette: MapPalette,
) {
  switch (layer.type) {
    case "background":
      return { "background-color": color };
    case "fill":
      return { "fill-color": color, "fill-outline-color": color };
    case "line":
      return { "line-color": color };
    case "symbol":
      return {
        "text-color": color,
        "text-halo-color": palette.labelHalo,
      };
    default:
      return {};
  }
}

function quietName(
  locale: string,
  hidden: readonly string[],
): ExpressionSpecification {
  const name: ExpressionSpecification = [
    "coalesce",
    ["get", `name:${locale}`],
    ["get", "name"],
    "",
  ];
  const list: ExpressionSpecification = ["literal", [...hidden]];
  return [
    "case",
    [
      "any",
      ["in", ["coalesce", ["get", "name"], ""], list],
      ["in", ["coalesce", ["get", `name:${locale}`], ""], list],
    ],
    "",
    name,
  ];
}

export function applyMapTheme(
  style: StyleSpecification,
  palette: MapPalette,
  { locale, hideLabelNames = [] }: ApplyOptions,
): StyleSpecification {
  const layers = style.layers.map((layer): LayerSpecification => {
    const detail = DETAIL_ROLES[layer.id];
    if (detail) {
      return {
        ...layer,
        paint: { ...layer.paint, ...paintFor(layer, palette[detail], palette) },
        layout: { ...layer.layout, visibility: "none" },
      } as LayerSpecification;
    }
    const role = ROLES[layer.id];
    if (!role) {
      return {
        ...layer,
        layout: { ...layer.layout, visibility: "none" },
      } as LayerSpecification;
    }
    const paint = {
      ...layer.paint,
      ...paintFor(layer, palette[role], palette),
    };
    let layout = layer.layout;
    if (
      layer.type === "symbol" &&
      PLACE_LABELS.has(layer.id) &&
      hideLabelNames.length > 0
    ) {
      layout = {
        ...layer.layout,
        "text-field": quietName(locale, hideLabelNames),
      };
    }
    return { ...layer, paint, layout } as LayerSpecification;
  });
  return { ...style, layers };
}
