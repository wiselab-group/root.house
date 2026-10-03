import { describe, expect, it } from "vitest";
import type { StyleSpecification } from "maplibre-gl";
import { applyMapTheme, type MapPalette } from "./apply-map-theme";

const palette: MapPalette = {
  land: "land",
  forest: "forest",
  water: "water",
  waterShadow: "shadow",
  road: "road",
  border: "border",
  countryBorder: "country",
  label: "label",
  labelHalo: "halo",
  waterLabel: "waterLabel",
};

const style = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "Background",
      type: "background",
      paint: { "background-color": "white" },
    },
    {
      id: "Water",
      type: "fill",
      source: "s",
      "source-layer": "water",
      paint: { "fill-color": "blue", "fill-opacity": 1 },
    },
    {
      id: "Building",
      type: "fill",
      source: "s",
      "source-layer": "building",
      paint: { "fill-color": "grey" },
    },
    {
      id: "Country border",
      type: "line",
      source: "s",
      "source-layer": "boundary",
      paint: {
        "line-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          "red",
          6,
          "pink",
        ],
        "line-width": 2,
      },
    },
    {
      id: "City labels",
      type: "symbol",
      source: "s",
      "source-layer": "place",
      layout: { "text-field": "{name:ru}" },
      paint: { "text-color": "black" },
    },
    {
      id: "Village labels",
      type: "symbol",
      source: "s",
      "source-layer": "place",
      layout: { "text-field": "{name}" },
    },
  ],
} as StyleSpecification;

const themed = applyMapTheme(style, palette, {
  locale: "ru",
  hideLabelNames: ["Киев"],
});
const layer = (id: string) =>
  themed.layers.find((l) => l.id === id) as unknown as {
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
  };

describe("applyMapTheme", () => {
  it("paints each layer by its role, keeping its other paint", () => {
    expect(layer("Background").paint).toEqual({ "background-color": "land" });
    expect(layer("Water").paint).toMatchObject({
      "fill-color": "water",
      "fill-opacity": 1,
    });
    expect(layer("Country border").paint).toMatchObject({
      "line-color": "country",
      "line-width": 2,
    });
    expect(layer("City labels").paint).toMatchObject({
      "text-color": "label",
      "text-halo-color": "halo",
    });
  });

  it("hides what isn't about the family", () => {
    expect(layer("Building").layout).toEqual({ visibility: "none" });
  });

  it("paints edit-only detail but keeps it hidden until asked for", () => {
    expect(layer("Village labels").layout).toMatchObject({
      visibility: "none",
    });
    expect(layer("Village labels").paint).toMatchObject({
      "text-color": "label",
    });
  });

  it("blanks the basemap's own label for a place the map already pins", () => {
    const field = layer("City labels").layout?.["text-field"];
    expect(JSON.stringify(field)).toContain("Киев");
    expect(JSON.stringify(field)).toContain("name:ru");
  });

  it("leaves labels alone when nothing is pinned", () => {
    const plain = applyMapTheme(style, palette, { locale: "ru" });
    const city = plain.layers.find(
      (l) => l.id === "City labels",
    ) as unknown as { layout: Record<string, unknown> };
    expect(city.layout["text-field"]).toBe("{name:ru}");
  });
});
