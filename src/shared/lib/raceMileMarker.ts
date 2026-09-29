export const RACE_MILE_MARKER_MIN = 0;
export const RACE_MILE_MARKER_MAX = 26.2;
export const RACE_MILE_MARKER_STEP = 0.1;
export const RACE_MILE_MARKER_DEFAULT = 1;

export function clampRaceMileMarker(miles: number): number {
  if (!Number.isFinite(miles)) {
    return RACE_MILE_MARKER_DEFAULT;
  }
  const stepped =
    Math.round(miles / RACE_MILE_MARKER_STEP) * RACE_MILE_MARKER_STEP;
  const clamped = Math.min(
    RACE_MILE_MARKER_MAX,
    Math.max(RACE_MILE_MARKER_MIN, stepped)
  );
  return Math.round(clamped * 10) / 10;
}

export function formatMileMarkerLabel(miles: number): string {
  const clamped = clampRaceMileMarker(miles);
  if (clamped === 0) {
    return 'Start';
  }
  const text =
    Math.abs(clamped - Math.round(clamped)) < 0.001
      ? String(Math.round(clamped))
      : clamped.toFixed(1);
  return `Mile ${text}`;
}

export function parseMileMarkerLabel(mile: string): number {
  const trimmed = mile.trim();
  if (!trimmed) {
    return RACE_MILE_MARKER_DEFAULT;
  }
  if (/^start$/i.test(trimmed)) {
    return 0;
  }
  const mileMatch = /^mile\s+([\d.]+)$/i.exec(trimmed);
  if (mileMatch) {
    return clampRaceMileMarker(Number(mileMatch[1]));
  }
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return clampRaceMileMarker(numeric);
  }
  return RACE_MILE_MARKER_DEFAULT;
}

export function formatPreviewMileLabel(miles: number): string {
  return formatMileMarkerLabel(miles).toUpperCase();
}

export function formatPreviewMileFromStored(mile: string): string {
  return formatMileMarkerLabel(parseMileMarkerLabel(mile)).toUpperCase();
}
