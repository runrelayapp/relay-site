import { useEffect, useRef, useState } from 'react';
import type { AppConfig } from '@/shared/config/env';
import { t } from '@/shared/lib/i18n';
import { searchAppleMusic } from '../lib/apple-music';
import { formatDurationMs, formatTimer } from '../lib/deliver';
import type { MusicTrack } from '../model/types';

interface SongPanelProps {
  isActive: boolean;
  config: AppConfig;
  selectedTrack: MusicTrack | null;
  onSelectTrack: (track: MusicTrack | null) => void;
  onError: (message: string) => void;
}

const MAX_TRACK_RESULTS = 10;
const TRACK_SKELETON_ROWS = 3;

export function SongPanel({
  isActive,
  config,
  selectedTrack,
  onSelectTrack,
  onError
}: SongPanelProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activePreviewTrackId, setActivePreviewTrackId] = useState<string | null>(null);
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(30);
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchRequestIdRef = useRef(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      audioRef.current?.pause();
    };
  }, []);

  const runSearch = async (searchQuery: string): Promise<void> => {
    const requestId = ++searchRequestIdRef.current;
    setIsSearching(true);
    onError('');
    try {
      const results = await searchAppleMusic(searchQuery, config);
      if (requestId !== searchRequestIdRef.current) {
        return;
      }
      setTracks(results.slice(0, MAX_TRACK_RESULTS));
    } catch (err) {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }
      setTracks([]);
      onError(err instanceof Error ? err.message : t('error.searchFailed'));
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  const handleQueryChange = (value: string): void => {
    setQuery(value);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (value.trim().length < 2) {
      searchRequestIdRef.current += 1;
      setTracks([]);
      setIsSearching(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      void runSearch(value);
    }, 350);
  };

  const playTrackPreview = (track: MusicTrack): void => {
    if (!track.previewUrl || !audioRef.current) {
      onError(t('race.song.noPreview'));
      return;
    }
    setActivePreviewTrackId(track.id);
    setOpenPlayerId(track.id);
    setPreviewElapsed(0);
    setPreviewDuration(30);
    audioRef.current.src = track.previewUrl;
    void audioRef.current.play().catch(() => {
      onError(t('race.song.previewFailed'));
      setActivePreviewTrackId(null);
      setOpenPlayerId(null);
    });
  };

  return (
    <section
      className="panel"
      id="panel-song"
      role="tabpanel"
      aria-labelledby="tab-song"
      data-active={isActive ? 'true' : 'false'}
    >
      <div className="card">
        <div className="music-head">
          <div className="music-brand">
            <span className="music-brand__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.365 1.43c0 1.14-.493 2.218-1.277 3.001-.784.784-1.862 1.277-3.001 1.277-.05-1.178.456-2.318 1.238-3.1.783-.783 1.923-1.29 3.04-1.178zm.752 4.562c-1.686-.099-3.118.952-3.925.952-.806 0-2.048-.928-3.372-.903-1.734.025-3.332 1.008-4.22 2.562-1.801 3.127-.462 7.756 1.292 10.3.862 1.248 1.888 2.644 3.235 2.593 1.298-.05 1.787-.839 3.356-.839 1.568 0 2.008.839 3.373.814 1.392-.025 2.268-1.248 3.123-2.5.984-1.436 1.388-2.833 1.413-2.907-.03-.015-2.715-1.042-2.742-4.135-.025-2.593 2.117-3.832 2.21-3.907-1.205-1.761-3.08-1.995-3.735-2.032z" />
              </svg>
            </span>
            <span className="music-brand__label">{t('race.song.searchBrand')}</span>
          </div>
          <span className="music-via">{t('race.song.via')}</span>
        </div>
        <div className="search-field">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            id="song-search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder={t('race.song.searchPlaceholder')}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
        </div>
        <ul
          className="track-list"
          aria-label={t('race.song.resultsAria')}
          aria-busy={isSearching}
        >
          {isSearching &&
            Array.from({ length: TRACK_SKELETON_ROWS }).map((_, index) => (
              <li key={`skeleton-${index}`} className="track-skeleton">
                <span className="track-skeleton__art" />
                <span className="track-skeleton__lines">
                  <span className="track-skeleton__line" />
                  <span className="track-skeleton__line track-skeleton__line--short" />
                </span>
                <span className="track-skeleton__action" />
              </li>
            ))}
          {!isSearching &&
            tracks.map((track) => {
              const isSelected = selectedTrack?.id === track.id;
              const isOpen = openPlayerId === track.id;
              const elapsed =
                activePreviewTrackId === track.id ? previewElapsed : 0;
              const duration =
                activePreviewTrackId === track.id ? previewDuration : 30;
              const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

              return (
                <li key={track.id} className="track-item" data-track-id={track.id}>
                  <button
                    type="button"
                    className="track-row"
                    aria-selected={isSelected}
                    onClick={() => onSelectTrack(track)}
                  >
                    {track.albumArtUrl ? (
                      <img className="track-art" src={track.albumArtUrl} alt="" />
                    ) : (
                      <div className="track-art" />
                    )}
                    <div className="track-meta">
                      <div className="track-title">{track.name}</div>
                      <div className="track-artist">{track.artist}</div>
                    </div>
                    <span className="track-duration">{formatDurationMs(track.durationMs)}</span>
                    <span
                      className="icon-btn"
                      role="presentation"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrackPreview(track);
                      }}
                    >
                      {isSelected ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7L8 5z" />
                        </svg>
                      )}
                    </span>
                  </button>
                  <div
                    className={`track-player${isOpen ? ' track-player--open' : ''}`}
                    hidden={!isOpen}
                  >
                    <div className="track-player__rail" aria-hidden="true">
                      <div className="track-player__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="track-player__times">
                      <span className="track-player__elapsed">{formatTimer(Math.floor(elapsed))}</span>{' '}
                      / <span className="track-player__duration">{formatTimer(Math.floor(duration))}</span>
                    </span>
                  </div>
                </li>
              );
            })}
        </ul>
        {selectedTrack && (
          <div className="preview-note">
            <button
              type="button"
              className="icon-btn"
              aria-label={t('race.song.previewPlayAria')}
              onClick={() => playTrackPreview(selectedTrack)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </button>
            <span>
              {selectedTrack.previewUrl
                ? t('race.song.previewAttached')
                : t('race.song.previewMissing')}
            </span>
          </div>
        )}
      </div>
      <audio
        ref={audioRef}
        playsInline
        hidden
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          setPreviewElapsed(audio.currentTime);
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setPreviewDuration(audio.duration);
          }
        }}
        onEnded={() => {
          setActivePreviewTrackId(null);
          setOpenPlayerId(null);
          setPreviewElapsed(0);
        }}
      />
    </section>
  );
}
