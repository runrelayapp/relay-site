import type { PageContext } from '../model/types';
import { t } from '@/shared/lib/i18n';

function looksLikeFirestoreDocumentId(value: string): boolean {
  return /^[A-Za-z0-9_-]{18,28}$/.test(value);
}

export function parseRaceIdFromLocation(
  pathname: string,
  search: string,
  routeRaceId?: string
): string {
  const params = new URLSearchParams(search);
  let raceId = (routeRaceId ?? params.get('raceId') ?? '').trim();
  const raceParam = params.get('race') ?? '';
  if (!raceId && looksLikeFirestoreDocumentId(raceParam)) {
    raceId = raceParam;
  }
  const parts = pathname.split('/').filter(Boolean);
  const raceSegmentIndex = parts.findIndex((part) => part === 'race');
  if (!raceId && raceSegmentIndex >= 0 && parts[raceSegmentIndex + 1]) {
    raceId = parts[raceSegmentIndex + 1];
  }
  return raceId.trim();
}

export function parsePageContext(
  pathname: string,
  search: string,
  routeRaceId?: string
): PageContext {
  const params = new URLSearchParams(search);
  const nameOverride = (params.get('name') ?? params.get('runnerName') ?? '').trim();

  return {
    raceId: parseRaceIdFromLocation(pathname, search, routeRaceId),
    nameOverride,
    name: t('race.defaultRunner'),
    race: t('race.defaultRace'),
    distance: 0,
    deliverMode: 'mile',
    maxTimeSeconds: 4 * 3600,
    messageTriggerType: 'gps_mile'
  };
}
