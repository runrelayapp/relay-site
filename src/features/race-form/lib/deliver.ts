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

export const MILESTONE_SNAPS: MilestoneSnap[] = [
  { mile: 0, title: 'Start line', detail: 'Send encouragement before the gun.' },
  { mile: 13.1, title: 'Half marathon', detail: 'Halfway on the course — send a boost.' },
  { mile: 20, title: 'The wall', detail: 'Heartbreak Hill — right when it counts.' },
  { mile: 26.2, title: 'Finish line', detail: 'Cross the line together.' }
];

export function formatMile(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function nearestMilestone(
  mile: number,
  distance: number
): MilestoneSnap {
  const points = MILESTONE_SNAPS.filter((p) => p.mile <= distance + 0.01);
  if (points.length === 0) {
    return { mile, title: `Mile ${formatMile(mile)}`, detail: '' };
  }
  let best = points[0];
  let bestDiff = Math.abs(mile - best.mile);
  for (const p of points) {
    const d = Math.abs(mile - p.mile);
    if (d < bestDiff) {
      best = p;
      bestDiff = d;
    }
  }
  if (bestDiff <= 0.75) {
    return best;
  }
  return { mile, title: `Mile ${formatMile(mile)}`, detail: '' };
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
