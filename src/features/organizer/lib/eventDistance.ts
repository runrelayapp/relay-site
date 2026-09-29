export const ORGANIZER_EVENT_DISTANCE_MIN = 0.1;
export const ORGANIZER_EVENT_DISTANCE_MAX = 26.2;
export const ORGANIZER_EVENT_DISTANCE_STEP = 0.1;
export const ORGANIZER_EVENT_DISTANCE_DEFAULT = 26.2;

export function clampEventDistanceMiles(miles: number): number {
  if (!Number.isFinite(miles)) {
    return ORGANIZER_EVENT_DISTANCE_DEFAULT;
  }
  const stepped =
    Math.round(miles / ORGANIZER_EVENT_DISTANCE_STEP) * ORGANIZER_EVENT_DISTANCE_STEP;
  const clamped = Math.min(
    ORGANIZER_EVENT_DISTANCE_MAX,
    Math.max(ORGANIZER_EVENT_DISTANCE_MIN, stepped)
  );
  return Math.round(clamped * 10) / 10;
}

export function formatEventDistanceMiles(miles: number): string {
  const clamped = clampEventDistanceMiles(miles);
  if (Math.abs(clamped - Math.round(clamped)) < 0.001) {
    return String(Math.round(clamped));
  }
  return clamped.toFixed(1);
}

export function parseStoredEventDistanceMiles(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return clampEventDistanceMiles(value);
}
