/** The slice of next-intl's `format.number` this needs. */
type NumberFormatter = (
  value: number,
  options: {
    style: "unit";
    unit: string;
    unitDisplay: "short";
    maximumFractionDigits: number;
  },
) => string;

const UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"];

/** 1536 → "1,5 КБ" / "1.5 kB" — the locale spells the unit, not us. */
export function formatBytes(bytes: number, number: NumberFormatter): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return number(value, {
    style: "unit",
    unit: UNITS[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 ? 0 : 1,
  });
}
