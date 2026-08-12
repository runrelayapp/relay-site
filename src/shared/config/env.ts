export interface AppConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  appleMusicSearchProxyUrl: string;
  appleMusicDeveloperTokenUrl: string;
  appleMusicUseMusicKit: boolean;
  appleMusicStorefront: string;
  appleMusicUseMockSearch: boolean;
  maxVoiceSeconds: number;
  maxTextLength: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.round(parsed);
}

export function getAppConfig(): AppConfig {
  return {
    firebase: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'relay-app-f7bbc.firebaseapp.com',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'relay-app-f7bbc',
      storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'relay-app-f7bbc.firebasestorage.app',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '881285746131',
      appId: import.meta.env.VITE_FIREBASE_APP_ID ?? ''
    },
    appleMusicSearchProxyUrl: '',
    appleMusicDeveloperTokenUrl: '',
    appleMusicUseMusicKit: false,
    appleMusicStorefront: 'us',
    appleMusicUseMockSearch: false,
    maxVoiceSeconds: Math.max(1, Math.min(120, parsePositiveInt(import.meta.env.VITE_MAX_VOICE_SECONDS, 30))),
    maxTextLength: parsePositiveInt(import.meta.env.VITE_MAX_TEXT_LENGTH, 250)
  };
}
