import type { AppConfig } from '@/shared/config/env';
import { t } from '@/shared/lib/i18n';
import type { MusicTrack } from '../model/types';

declare global {
  interface Window {
    MusicKit?: {
      configure: (options: {
        developerToken: string;
        app: { name: string; build: string };
      }) => Promise<void>;
      getInstance: () => MusicKitInstance;
    };
    __relayMusicKit?: MusicKitInstance;
  }
}

interface MusicKitInstance {
  api: {
    music: (path: string) => Promise<{ data?: unknown } | unknown>;
  };
}

function normalizeItunesResults(results: Array<Record<string, unknown>>): MusicTrack[] {
  return results
    .map((item) => {
      const trackId = item.trackId;
      if (typeof trackId !== 'number' && typeof trackId !== 'string') {
        return null;
      }
      const artwork = typeof item.artworkUrl100 === 'string' ? item.artworkUrl100 : '';
      const collection = typeof item.collectionName === 'string' ? item.collectionName : '';
      const artistName = typeof item.artistName === 'string' ? item.artistName : '';
      return {
        id: String(trackId),
        name: typeof item.trackName === 'string' ? item.trackName : 'Unknown track',
        artist: collection ? `${artistName} · ${collection}` : artistName,
        albumArtUrl: artwork.replace('100x100bb', '200x200bb'),
        previewUrl: typeof item.previewUrl === 'string' ? item.previewUrl : null,
        appleMusicUrl: typeof item.trackViewUrl === 'string' ? item.trackViewUrl : null,
        durationMs: typeof item.trackTimeMillis === 'number' ? item.trackTimeMillis : 0
      };
    })
    .filter((row): row is MusicTrack => row !== null);
}

export function searchAppleMusicCatalog(query: string): Promise<MusicTrack[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const callbackName = `relayItunes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const cleanup = (): void => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      script.remove();
    };

    (window as unknown as Record<string, unknown>)[callbackName] = (payload: {
      resultCount: number;
      results: Array<Record<string, unknown>>;
    }) => {
      cleanup();
      resolve(normalizeItunesResults(payload.results ?? []));
    };

    const script = document.createElement('script');
    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', trimmed);
    url.searchParams.set('entity', 'song');
    url.searchParams.set('limit', '10');
    url.searchParams.set('callback', callbackName);

    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error(t('error.appleSearchFailed')));
    };

    document.head.append(script);

    window.setTimeout(() => {
      if ((window as unknown as Record<string, unknown>)[callbackName]) {
        cleanup();
        reject(new Error(t('error.appleSearchTimeout')));
      }
    }, 12000);
  });
}

function normalizeMusicApiPayload(payload: unknown): MusicTrack[] {
  const root = payload as {
    results?: { songs?: { data?: Array<Record<string, unknown>> } };
    songs?: { data?: Array<Record<string, unknown>> };
  };
  const songs = root?.results?.songs?.data ?? root?.songs?.data ?? [];
  return songs.map((item) => {
    const attrs = (item.attributes ?? {}) as Record<string, unknown>;
    const artwork = attrs.artwork as { url?: string } | undefined;
    const art = typeof artwork?.url === 'string' ? artwork.url : '';
    const previews = attrs.previews as Array<{ url?: string }> | undefined;
    const preview =
      Array.isArray(previews) && previews[0]?.url
        ? previews[0].url
        : typeof attrs.previewUrl === 'string'
          ? attrs.previewUrl
          : null;
    return {
      id: String(item.id ?? attrs.id),
      name: typeof attrs.name === 'string' ? attrs.name : 'Unknown track',
      artist: typeof attrs.artistName === 'string' ? attrs.artistName : '',
      albumArtUrl: art.replace('{w}', '200').replace('{h}', '200'),
      previewUrl: preview,
      appleMusicUrl: typeof attrs.url === 'string' ? attrs.url : null,
      durationMs: typeof attrs.durationInMillis === 'number' ? attrs.durationInMillis : 0
    };
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load MusicKit'));
    document.head.append(script);
  });
}

async function ensureMusicKit(config: AppConfig): Promise<MusicKitInstance> {
  if (window.__relayMusicKit) {
    return window.__relayMusicKit;
  }
  await loadScript('https://js-cdn.music.apple.com/musickit/v3/musickit.js');
  const tokenUrl = config.appleMusicDeveloperTokenUrl;
  if (!tokenUrl) {
    throw new Error('appleMusicDeveloperTokenUrl is required for MusicKit');
  }
  const res = await fetch(tokenUrl);
  if (!res.ok) {
    throw new Error('Could not fetch Apple Music developer token');
  }
  const { token } = (await res.json()) as { token?: string };
  if (typeof token !== 'string') {
    throw new Error('Invalid developer token response');
  }
  if (!window.MusicKit) {
    throw new Error('MusicKit failed to load');
  }
  await window.MusicKit.configure({
    developerToken: token,
    app: { name: 'Relay', build: '1.0.0' }
  });
  window.__relayMusicKit = window.MusicKit.getInstance();
  return window.__relayMusicKit;
}

async function searchViaMusicKit(query: string, config: AppConfig): Promise<MusicTrack[]> {
  const music = await ensureMusicKit(config);
  const storefront = config.appleMusicStorefront ?? 'us';
  const response = await music.api.music(
    `/v1/catalog/${storefront}/search?types=songs&limit=25&term=${encodeURIComponent(query)}`
  );
  const payload =
    response && typeof response === 'object' && 'data' in response
      ? (response as { data: unknown }).data
      : response;
  return normalizeMusicApiPayload(payload);
}

function mockAppleMusicResults(query: string): MusicTrack[] {
  const q = query.toLowerCase();
  const pool: MusicTrack[] = [
    {
      id: 'mock-1',
      name: 'Stronger',
      artist: 'Kanye West · Graduation',
      albumArtUrl: '',
      previewUrl:
        'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ad/88/77/ad8877d7-9b62-5b8e-0f3a-8e8e8e8e8e8e/mzaf_1234567890.mp3',
      appleMusicUrl: 'https://music.apple.com/us/album/stronger/1451909647?i=1451909655',
      durationMs: 311000
    }
  ];
  if (q.includes('strong') || q.includes('kanye')) {
    return pool;
  }
  return pool.filter(
    (track) => track.name.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q)
  );
}

export async function searchAppleMusic(query: string, config: AppConfig): Promise<MusicTrack[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  if (config.appleMusicSearchProxyUrl) {
    const url = new URL(config.appleMusicSearchProxyUrl, window.location.origin);
    url.searchParams.set('q', trimmed);
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(t('error.appleSearchFailed'));
    }
    const data: unknown = await res.json();
    return normalizeMusicApiPayload(data);
  }

  if (config.appleMusicUseMusicKit && config.appleMusicDeveloperTokenUrl) {
    return searchViaMusicKit(trimmed, config);
  }

  if (config.appleMusicUseMockSearch) {
    return mockAppleMusicResults(trimmed);
  }

  return searchAppleMusicCatalog(trimmed);
}
