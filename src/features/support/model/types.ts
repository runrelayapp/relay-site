export type SupportPlatform = 'iPhone' | 'Android' | 'Other';

export type SupportTopic =
  | 'Messages not playing'
  | 'Supporter link'
  | 'Account'
  | 'Race Memory'
  | 'Distance tracking'
  | 'Notifications'
  | 'Song links'
  | 'Other';

export const SUPPORT_PLATFORMS: readonly SupportPlatform[] = [
  'iPhone',
  'Android',
  'Other'
] as const;

export const SUPPORT_TOPICS: readonly SupportTopic[] = [
  'Messages not playing',
  'Supporter link',
  'Account',
  'Race Memory',
  'Distance tracking',
  'Notifications',
  'Song links',
  'Other'
] as const;

export interface SupportFormValues {
  name: string;
  email: string;
  platform: SupportPlatform | '';
  topic: SupportTopic | '';
  message: string;
}

export const SUPPORT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdOEIU_aN2UbQsrDiFvrYfagi3p7yVClwHTwdf4Rui95FpowQ/formResponse';

export const SUPPORT_FORM_ENTRIES = {
  name: 'entry.1407424525',
  email: 'entry.1222713281',
  platform: 'entry.2065652974',
  topic: 'entry.1774840310',
  message: 'entry.362331806'
} as const;
