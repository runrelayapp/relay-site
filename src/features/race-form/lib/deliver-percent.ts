/** Shared percent helpers for the deliver slider (0–100). */

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Snap miles to nearest 0.1 within [0, distance]. */
export function snapMile(mile: number, distance: number): number {
  if (!(distance > 0)) {
    return 0;
  }
  const snapped = Math.round(mile * 10) / 10;
  return Math.min(distance, Math.max(0, snapped));
}

/** Snap elapsed seconds to nearest whole minute within [0, maxSeconds]. */
export function snapTimeSeconds(seconds: number, maxSeconds: number): number {
  if (!(maxSeconds > 0)) {
    return 0;
  }
  const snapped = Math.round(seconds / 60) * 60;
  return Math.min(maxSeconds, Math.max(0, snapped));
}

export function mileToPercent(mile: number, distance: number): number {
  if (!(distance > 0)) {
    return 0;
  }
  return clampPercent((snapMile(mile, distance) / distance) * 100);
}

export function percentToMile(percent: number, distance: number): number {
  if (!(distance > 0)) {
    return 0;
  }
  return snapMile((clampPercent(percent) / 100) * distance, distance);
}

export function timeToPercent(seconds: number, maxSeconds: number): number {
  if (!(maxSeconds > 0)) {
    return 0;
  }
  return clampPercent(
    (snapTimeSeconds(seconds, maxSeconds) / maxSeconds) * 100
  );
}

export function percentToTime(percent: number, maxSeconds: number): number {
  if (!(maxSeconds > 0)) {
    return 0;
  }
  return snapTimeSeconds(
    (clampPercent(percent) / 100) * maxSeconds,
    maxSeconds
  );
}

export function isSameMileTrigger(
  left: number,
  right: number,
  distance: number
): boolean {
  return snapMile(left, distance) === snapMile(right, distance);
}

export function isSameTimeTrigger(
  left: number,
  right: number,
  maxSeconds: number
): boolean {
  return (
    snapTimeSeconds(left, maxSeconds) === snapTimeSeconds(right, maxSeconds)
  );
}
