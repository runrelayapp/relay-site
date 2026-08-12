import { useEffect, useRef, useState } from 'react';
import { t } from '@/shared/lib/i18n';
import { formatTimer } from '../lib/deliver';
import { pickVoiceRecorderMimeType } from '../lib/voice';

type VoiceState = 'idle' | 'recording' | 'preview';

interface VoicePanelProps {
  isActive: boolean;
  maxVoiceSeconds: number;
  voiceBlob: Blob | null;
  onVoiceBlobChange: (blob: Blob | null) => void;
  onError: (message: string) => void;
}

export function VoicePanel({
  isActive,
  maxVoiceSeconds,
  voiceBlob,
  onVoiceBlobChange,
  onError
}: VoicePanelProps): React.JSX.Element {
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceBlob ? 'preview' : 'idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerElapsed, setPlayerElapsed] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!voiceBlob) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.removeAttribute('src');
      }
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = URL.createObjectURL(voiceBlob);
    if (audioRef.current) {
      audioRef.current.src = objectUrlRef.current;
      audioRef.current.load();
    }
  }, [voiceBlob]);

  const syncRecordingProgress = (seconds: number): void => {
    setRecordSeconds(seconds);
  };

  const handleStart = async (): Promise<void> => {
    onError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickVoiceRecorderMimeType();
      const mediaRecorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm'
        });
        onVoiceBlobChange(blob);
        setIsPlaying(false);
        setPlayerElapsed(0);
        setPlayerDuration(0);
        setVoiceState('preview');
      };

      mediaRecorder.start(200);
      syncRecordingProgress(0);
      setVoiceState('recording');
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          const next = prev + 1;
          if (next >= maxVoiceSeconds) {
            mediaRecorder.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      onError(t('race.voice.micRequired'));
    }
  };

  const handleStop = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRedo = (): void => {
    onVoiceBlobChange(null);
    setIsPlaying(false);
    setPlayerElapsed(0);
    setPlayerDuration(0);
    setVoiceState('idle');
  };

  const handlePlayToggle = async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      return;
    }
    onError('');
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        onError(t('race.voice.playFailed'));
      }
    } else {
      audio.pause();
    }
  };

  const recordingRatio =
    maxVoiceSeconds > 0 ? Math.min(1, recordSeconds / maxVoiceSeconds) : 0;
  const playerRatio =
    playerDuration > 0 ? Math.min(100, (playerElapsed / playerDuration) * 100) : 0;

  return (
    <section
      className="panel"
      id="panel-voice"
      role="tabpanel"
      aria-labelledby="tab-voice"
      data-active={isActive ? 'true' : 'false'}
    >
      <div className={`card voice-record${voiceState !== 'idle' ? ' hidden' : ''}`}>
        <p className="voice-record__hint">
          {t('race.voice.limitHint', { seconds: maxVoiceSeconds })}
        </p>
        <button type="button" className="btn btn--primary voice-record__cta" onClick={() => void handleStart()}>
          <svg className="btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0M12 18v3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{t('race.voice.record')}</span>
        </button>
      </div>

      <div className={`card voice-record${voiceState !== 'recording' ? ' hidden' : ''}`}>
        <div className="visualizer" aria-hidden="true">
          <span className="visualizer__bar" />
          <span className="visualizer__bar" />
          <span className="visualizer__bar" />
          <span className="visualizer__bar" />
          <span className="visualizer__bar" />
        </div>
        <div className="voice-recording__progress" aria-hidden="true">
          <div
            className="voice-recording__progress-fill"
            style={{ width: `${recordingRatio * 100}%` }}
          />
        </div>
        <p className="voice-timer" aria-live="polite">
          <span>{formatTimer(recordSeconds)}</span>
          <span className="voice-timer__sep">/</span>
          <span>{formatTimer(maxVoiceSeconds)}</span>
        </p>
        <button type="button" className="btn btn--secondary" onClick={handleStop}>
          {t('race.voice.stop')}
        </button>
      </div>

      <div className={`card voice-player${voiceState !== 'preview' ? ' hidden' : ''}`}>
        <div className="voice-playback">
          <button
            type="button"
            className="icon-btn voice-playback__play"
            aria-label={t('race.voice.playAria')}
            aria-pressed={isPlaying}
            onClick={() => void handlePlayToggle()}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 5h3v14H7V5zm7 0h3v14h-3V5z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
          <div className="voice-playback__body">
            <p className="voice-playback__label">{t('race.voice.yourRecording')}</p>
            <div className="track-player track-player--open voice-playback__progress">
              <div className="track-player__rail" aria-hidden="true">
                <div className="track-player__fill" style={{ width: `${playerRatio}%` }} />
              </div>
              <span className="track-player__times">
                <span>{formatTimer(Math.floor(playerElapsed))}</span> /{' '}
                <span>{formatTimer(Math.floor(playerDuration))}</span>
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--danger-outline voice-player__redo"
          onClick={handleRedo}
        >
          {t('race.voice.redo')}
        </button>
        <audio
          ref={audioRef}
          playsInline
          hidden
          onLoadedMetadata={(e) => {
            const audio = e.currentTarget;
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
              setPlayerDuration(audio.duration);
            }
          }}
          onTimeUpdate={(e) => {
            const audio = e.currentTarget;
            setPlayerElapsed(audio.currentTime);
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
              setPlayerDuration(audio.duration);
            }
          }}
          onEnded={(e) => {
            setIsPlaying(false);
            e.currentTarget.currentTime = 0;
            setPlayerElapsed(0);
          }}
          onPause={(e) => {
            if (!e.currentTarget.ended) {
              setIsPlaying(false);
            }
          }}
          onPlay={() => setIsPlaying(true)}
        />
      </div>
    </section>
  );
}
