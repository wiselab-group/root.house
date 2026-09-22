import type { StyleSpecification } from "maplibre-gl";

/**
 * MapTiler's hosted Cloud styles (streets-v2 included) hardcode every label
 * layer's text-field to `name:en` — the style.json's own `?language=ru`
 * query param has no effect on these pre-built styles (confirmed against
 * the live API: identical text-field values returned with and without the
 * param). MapTiler's own docs point to @maptiler/sdk's runtime setLanguage()
 * for this, but that class is only usable through their own Map wrapper —
 * not cleanly composable with react-map-gl's mapLib prop (tried, the
 * MLAdapters are tied to @vis.gl/react-maplibre's own peer dependency
 * resolution, not a drop-in swap). Cheaper fix: rewrite every text-field in
 * the style JSON ourselves, client-side, right after fetching it — same
 * `name:<lang>` OSM tagging convention MapTiler's own tiles already use
 * (confirmed against tiles.json's tilestats), just pointed at "ru" with a
 * fallback to the untranslated `name` for anything with no Russian tag.
 */
const TARGET_LANGUAGE = "ru";
const SOURCE_LANGUAGE = "en";

function rewriteExpression(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (
      value[0] === "get" &&
      typeof value[1] === "string" &&
      value[1] === `name:${SOURCE_LANGUAGE}`
    ) {
      return ["get", `name:${TARGET_LANGUAGE}`];
    }
    return value.map(rewriteExpression);
  }
  if (typeof value === "string") {
    return value.replaceAll(
      `{name:${SOURCE_LANGUAGE}}`,
      `{name:${TARGET_LANGUAGE}}`,
    );
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => [k, rewriteExpression(v)] as const,
    );
    return Object.fromEntries(entries);
  }
  return value;
}

export function localizeStyleLabels(
  style: StyleSpecification,
): StyleSpecification {
  const layers = style.layers.map((layer) => {
    if (!("layout" in layer) || !layer.layout) return layer;
    const layout = layer.layout as Record<string, unknown>;
    if (!("text-field" in layout)) return layer;
    return {
      ...layer,
      layout: {
        ...layout,
        "text-field": rewriteExpression(layout["text-field"]),
      },
    };
  });
  return { ...style, layers } as StyleSpecification;
}
