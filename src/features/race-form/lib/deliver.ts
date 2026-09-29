import type { DeliverMode, MessageTriggerType, MilestoneSnap, TimeSnap } from '../model/types';

export function deliverModeFromMessageTrigger(trigger: unknown): DeliverMode {
  return trigger === 'timer_time' ? 'time' : 'mile';
}

export function messageTriggerFromFirestore(
  trigger: unknown,
  deliverMode: DeliverMode
): MessageTriggerType {
  if (trigger === 'timer_time' || trigger === 'gps_mile') {
    return trigger;
  }
  return deliverMode === 'time' ? 'timer_time' : 'gps_mile';
}

export function buildTimeSnaps(maxSeconds: number): TimeSnap[] {
  const max = Math.max(60, maxSeconds);
  return [
    { seconds: 0, title: 'Start line', detail: 'Send encouragement before the gun.' },
    {
      seconds: Math.round(max * 0.5),
      title: 'Halfway there',
      detail: 'Halfway on the clock — send a boost.'
    },
    {
      seconds: Math.round(max * 0.75),
      title: 'The grind',
      detail: 'When the race gets honest — they need you.'
    },
    { seconds: max, title: 'Finish line', detail: 'Cross the line together.' }
  ];
}

/** Milestone labels scaled to this race distance (not fixed marathon miles). */
export function buildMilestoneSnaps(distanceMiles: number): MilestoneSnap[] {
  const distance = Math.max(0.1, distanceMiles);
  return [
    {
      mile: 0,
      title: 'Start line',
      detail: 'Send encouragement before the gun.'
    },
    {
      mile: roundMile(distance * 0.5),
      title: 'Halfway there',
      detail: 'Halfway on the course — send a boost.'
    },
    {
      mile: roundMile(distance * 0.75),
      title: 'The grind',
      detail: 'When the race gets honest — they need you.'
    },
    {
      mile: roundMile(distance),
      title: 'Finish line',
      detail: 'Cross the line together.'
    }
  ];
}

function roundMile(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatRaceClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function nearestTimeSnap(
  seconds: number,
  maxSeconds: number,
  snaps: TimeSnap[]
): TimeSnap & { isPreset: boolean } {
  const clamped = Math.min(Math.max(0, seconds), maxSeconds);
  const windowSec = Math.max(45, Math.round(maxSeconds * 0.03));
  let best = snaps[0];
  let bestDiff = Math.abs(clamped - best.seconds);
  for (const snap of snaps) {
    const diff = Math.abs(clamped - snap.seconds);
    if (diff < bestDiff) {
      best = snap;
      bestDiff = diff;
    }
  }
  if (bestDiff <= windowSec) {
    return { ...best, isPreset: true };
  }
  return {
    seconds: clamped,
    title: 'On the course',
    detail: '',
    isPreset: false
  };
}

export function formatMile(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function nearestMilestone(
  mile: number,
  distance: number
): MilestoneSnap {
  const snaps = buildMilestoneSnaps(distance);
  const clamped = Math.min(Math.max(0, mile), Math.max(0.1, distance));
  const windowMiles = Math.max(0.05, distance * 0.03);

  let best = snaps[0];
  let bestDiff = Math.abs(clamped - best.mile);
  for (const snap of snaps) {
    const diff = Math.abs(clamped - snap.mile);
    if (diff < bestDiff) {
      best = snap;
      bestDiff = diff;
    }
  }

  if (bestDiff <= windowMiles) {
    return best;
  }

  return { mile: clamped, title: `Mile ${formatMile(clamped)}`, detail: '' };
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function formatTimer(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}
