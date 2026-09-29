import { t } from '@/shared/lib/i18n';
import { formatIsoDateForDisplay } from '@/shared/lib/formatIsoDate';
import type { AdminRaceSummary } from '../model/types';
import consoleStyles from '@/shared/styles/console.module.css';

export function formatAdminRaceDateDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return t('admin.races.noDate');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return formatIsoDateForDisplay(trimmed);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  return trimmed;
}

export function adminRaceStatusLabel(status: AdminRaceSummary['status']): string {
  switch (status) {
    case 'active':
      return t('admin.status.active');
    case 'completed':
      return t('admin.status.completed');
    case 'upcoming':
      return t('admin.status.upcoming');
    default:
      return t('admin.status.unknown');
  }
}

export function adminRaceStatusClass(status: AdminRaceSummary['status']): string {
  switch (status) {
    case 'active':
    case 'completed':
      return `${consoleStyles.status} ${consoleStyles.statusActive}`;
    case 'upcoming':
      return `${consoleStyles.status} ${consoleStyles.statusPending}`;
    default:
      return `${consoleStyles.status} ${consoleStyles.statusPaused}`;
  }
}

export function adminRaceRunnerDisplayName(race: AdminRaceSummary): string {
  if (race.runnerUserMissing) {
    return t('admin.race.detail.runnerDeletedName');
  }
  const full = race.runnerFullName?.trim();
  if (full) {
    return full;
  }
  const username = race.runnerUsername?.trim();
  if (username) {
    return username.startsWith('@') ? username : `@${username}`;
  }
  if (race.runnerEmail?.trim()) {
    return race.runnerEmail.trim();
  }
  return t('admin.races.unknownRunner');
}
