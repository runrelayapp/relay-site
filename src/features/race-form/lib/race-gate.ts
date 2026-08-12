import { doc, getDoc } from 'firebase/firestore';
import type { FirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import {
  deliverModeFromMessageTrigger,
  messageTriggerFromFirestore
} from './deliver';
import { mapRaceGateError } from './errors';
import type { PageContext, RaceGateResult } from '../model/types';

function parseDistanceMilesFromRaceData(data: Record<string, unknown>): number | null {
  const denormalized = data.distanceMiles;
  if (typeof denormalized === 'number' && Number.isFinite(denormalized) && denormalized > 0) {
    return denormalized;
  }

  const distance = data.distance;
  if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
    return distance;
  }
  if (!distance || typeof distance !== 'object') {
    return null;
  }
  const distanceObj = distance as { value?: unknown; unit?: unknown };
  const value = Number(distanceObj.value);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (distanceObj.unit === 'km') {
    return value / 1.609344;
  }
  return value;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getDaysUntilRaceDay(scheduledAt: string): number | null {
  const raceDate = new Date(scheduledAt);
  if (Number.isNaN(raceDate.getTime())) {
    return null;
  }
  raceDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((raceDate.getTime() - today.getTime()) / MS_PER_DAY);
}

export async function resolveRaceGate(
  firebaseCtx: FirebaseContext | null,
  context: PageContext
): Promise<RaceGateResult> {
  const missingTitle = t('race.unavailable.missingTitle');
  const missingBody = t('race.unavailable.missingBody');

  const raceId = context.raceId.trim();
  if (!raceId) {
    return { ok: false, title: missingTitle, body: missingBody };
  }

  if (!firebaseCtx) {
    return {
      ok: false,
      title: t('race.unavailable.formTitle'),
      body: t('race.unavailable.formBody')
    };
  }

  try {
    const snap = await getDoc(doc(firebaseCtx.db, 'races', raceId));
    if (!snap.exists()) {
      return { ok: false, title: missingTitle, body: missingBody };
    }

    const data = snap.data() as Record<string, unknown>;

    const raceDateRaw = data.raceDate;
    if (typeof raceDateRaw === 'string' && raceDateRaw.trim()) {
      const daysUntilRace = getDaysUntilRaceDay(raceDateRaw);
      if (daysUntilRace !== null && daysUntilRace < 0) {
        return {
          ok: false,
          title: t('race.unavailable.finishedTitle'),
          body: t('race.unavailable.finishedBody')
        };
      }
    }

    const fromFirestoreMiles = parseDistanceMilesFromRaceData(data);
    const deliverMode = deliverModeFromMessageTrigger(data.messageTriggerType);
    const messageTriggerType = messageTriggerFromFirestore(data.messageTriggerType, deliverMode);
    const goalSeconds =
      typeof data.goalTimeSeconds === 'number' && data.goalTimeSeconds > 0
        ? Math.round(data.goalTimeSeconds)
        : context.maxTimeSeconds;
    const raceLabel =
      typeof data.raceName === 'string' && data.raceName.trim()
        ? data.raceName.trim()
        : context.race;

    const runnerUserId =
      typeof data.userId === 'string' && data.userId.trim() ? data.userId.trim() : undefined;

    const enriched: PageContext = {
      ...context,
      raceId,
      name: context.nameOverride || context.name,
      race: raceLabel,
      distance: fromFirestoreMiles != null ? fromFirestoreMiles : 0,
      deliverMode,
      maxTimeSeconds: goalSeconds,
      messageTriggerType,
      runnerUserId
    };

    return { ok: true, context: enriched };
  } catch (err) {
    const mapped = mapRaceGateError(err);
    if (mapped) {
      return { ok: false, title: mapped.title, body: mapped.body };
    }
    return {
      ok: false,
      title: missingTitle,
      body: missingBody
    };
  }
}

export async function resolveRunnerDisplayName(
  firebaseCtx: FirebaseContext | null,
  context: PageContext
): Promise<string> {
  if (context.nameOverride) {
    return context.nameOverride;
  }
  if (!firebaseCtx || !context.runnerUserId) {
    return context.name;
  }
  try {
    const userSnap = await getDoc(doc(firebaseCtx.db, 'users', context.runnerUserId));
    if (!userSnap.exists()) {
      return context.name;
    }
    const profile = userSnap.data() as Record<string, unknown>;
    const fullName = typeof profile.fullName === 'string' ? profile.fullName.trim() : '';
    const username = typeof profile.username === 'string' ? profile.username.trim() : '';
    const fromProfile = fullName || username.replace(/^@/, '') || '';
    return fromProfile || context.name;
  } catch {
    return context.name;
  }
}
