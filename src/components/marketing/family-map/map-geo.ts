/**
 * A hand-simplified Baltic coastline for the landing's family map — enough
 * to read as "the Gulf of Finland and the Gulf of Riga", nothing more.
 * Plain equirectangular projection into a 100 × 100 box spanning
 * lon 20.5–30.5, lat 56.1–61 (outlines run past it and are clipped); the box is drawn at that window's real
 * proportions (MAP_ASPECT), so the shapes aren't stretched.
 */
const LON_MIN = 20.5;
const LON_SPAN = 10;
const LAT_MAX = 61;
const LAT_SPAN = 4.9;

/** Width / height of the window at ~58°N (cos 58° ≈ 0.53). */
export const MAP_ASPECT = (LON_SPAN * 0.53) / LAT_SPAN;

export type LonLat = readonly [number, number];

export function project([lon, lat]: LonLat): { x: number; y: number } {
  return {
    x: ((lon - LON_MIN) / LON_SPAN) * 100,
    y: ((LAT_MAX - lat) / LAT_SPAN) * 100,
  };
}

function toPath(points: readonly LonLat[]): string {
  return (
    points
      .map((point, index) => {
        const { x, y } = project(point);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

/** The sea, from the top-left corner round the coast to the bottom-left. */
const SEA: readonly LonLat[] = [
  [19.5, 61.2],
  [21.4, 61.2],
  [21.5, 60.8],
  [21.3, 60.4],
  [22.3, 60.05],
  [23.0, 59.85],
  [23.9, 60.05],
  [24.9, 60.15],
  [26.0, 60.35],
  [27.2, 60.5],
  [28.6, 60.6],
  [29.6, 60.2],
  [30.2, 59.92],
  [29.2, 59.85],
  [28.4, 59.65],
  [27.8, 59.45],
  [26.6, 59.55],
  [25.6, 59.55],
  [24.75, 59.45],
  [24.0, 59.3],
  [23.45, 59.2],
  [23.5, 58.95],
  [23.8, 58.6],
  [24.45, 58.38],
  [24.3, 57.95],
  [24.4, 57.4],
  [24.2, 57.05],
  [23.6, 56.98],
  [23.0, 57.15],
  [22.6, 57.75],
  [21.7, 57.5],
  [21.0, 56.9],
  [21.05, 56.5],
  [21.07, 56.0],
  [21.15, 55.7],
  [20.95, 55.25],
  [20.5, 54.95],
  [19.9, 54.9],
  [19.5, 54.5],
];
const ISLANDS: readonly (readonly LonLat[])[] = [
  [
    [21.85, 58.3],
    [22.2, 58.55],
    [23.0, 58.6],
    [23.4, 58.35],
    [22.6, 58.0],
    [22.1, 57.9],
    [21.9, 58.05],
  ],
  [
    [22.2, 58.85],
    [22.6, 59.05],
    [23.05, 58.9],
    [22.85, 58.7],
    [22.4, 58.7],
  ],
];
const LAKE: readonly LonLat[] = [
  [27.0, 58.9],
  [27.4, 59.0],
  [27.9, 58.95],
  [27.8, 58.5],
  [27.55, 58.2],
  [27.7, 57.85],
  [28.05, 57.9],
  [28.0, 58.3],
  [27.5, 58.45],
  [27.2, 58.7],
];

export const SEA_PATH = toPath(SEA);
export const ISLAND_PATHS = ISLANDS.map(toPath);
export const LAKE_PATH = toPath(LAKE);
