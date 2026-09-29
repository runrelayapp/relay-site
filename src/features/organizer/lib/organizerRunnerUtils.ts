import type { OrganizerEventParticipant } from '../model/types';

import { formatIsoDateForDisplay } from '@/shared/lib/formatIsoDate';

export type OrganizerRunnerStatusKey =
  | 'finished'
  | 'running'
  | 'not-started'
  | 'scheduled'
  | 'unknown';

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function mapParticipantStatusKey(status: string): OrganizerRunnerStatusKey {
  switch (status) {
    case 'completed':
      return 'finished';
    case 'active':
      return 'running';
    case 'upcoming':
      return 'not-started';
    default:
      return 'unknown';
  }
}

export { formatIsoDateForDisplay };

export function participantSearchBlob(row: OrganizerEventParticipant): string {
  return `${row.displayName} ${row.username ?? ''} ${row.raceName}`.toLowerCase();
}
