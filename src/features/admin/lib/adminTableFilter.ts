import type {
  AdminEventCode,
  AdminOrganizer,
  AdminRaceSummary,
  AdminReview,
  AdminUserSummary
} from '../model/types';

function normalizeNeedle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function filterAdminOrganizer(item: AdminOrganizer, query: string): boolean {
  const q = normalizeNeedle(query);
  if (!q) {
    return true;
  }
  const blob = `${item.name} ${item.email ?? ''} ${item.id}`;
  return blob.toLowerCase().includes(q);
}

export function filterAdminEventCode(item: AdminEventCode, query: string): boolean {
  const q = normalizeNeedle(query);
  if (!q) {
    return true;
  }
  const blob = `${item.code} ${item.eventName} ${item.organizerDirectoryName} ${
    item.organizerName
  } ${item.organizerEmail ?? ''} ${item.organizerId ?? ''} ${item.organizerUserId ?? ''}`;
  return blob.toLowerCase().includes(q);
}

export function filterAdminUser(item: AdminUserSummary, query: string): boolean {
  const q = normalizeNeedle(query);
  if (!q) {
    return true;
  }
  const blob = `${item.fullName} ${item.username} ${item.email ?? ''} ${item.id}`;
  return blob.toLowerCase().includes(q);
}

export function filterAdminReview(item: AdminReview, query: string): boolean {
  const q = normalizeNeedle(query);
  if (!q) {
    return true;
  }
  const blob = [
    item.comment,
    item.raceId,
    item.raceName ?? '',
    item.runnerEmail ?? '',
    item.runnerFullName ?? '',
    item.runnerUsername ?? '',
    item.userId,
    String(item.rating)
  ].join(' ');
  return blob.toLowerCase().includes(q);
}

export function filterAdminRace(item: AdminRaceSummary, query: string): boolean {
  const q = normalizeNeedle(query);
  if (!q) {
    return true;
  }
  const blob = [
    item.raceName,
    item.id,
    item.eventCode ?? '',
    item.raceDate,
    item.runnerUsername ?? '',
    item.runnerEmail ?? '',
    item.runnerFullName ?? '',
    item.userId
  ].join(' ');
  return blob.toLowerCase().includes(q);
}
