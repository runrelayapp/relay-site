export const ORGANIZER_PORTAL_TABS = [
  'dashboard',
  'runners',
  'messages',
  'event'
] as const;

export type OrganizerPortalTab = (typeof ORGANIZER_PORTAL_TABS)[number];

export function isOrganizerPortalTab(value: string | undefined): value is OrganizerPortalTab {
  return ORGANIZER_PORTAL_TABS.includes(value as OrganizerPortalTab);
}
