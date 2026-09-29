import { useEffect, useRef, useState } from 'react';
import { t } from '@/shared/lib/i18n';
import styles from '../styles/admin.module.css';

export interface AdminAudioPlayerProps {
  src: string | null;
  label: string;
  emptyLabel: string;
}

export function AdminAudioPlayer({
  src,
  label,
  emptyLabel
}: AdminAudioPlayerProps): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [src]);

  if (!src) {
    return <p className={styles.mutedInline}>{emptyLabel}</p>;
  }

  const handleToggle = async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch {
      setHasError(true);
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.player}>
      <audio
        ref={audioRef}
        preload="none"
        src={src}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setHasError(true);
          setIsPlaying(false);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      <button
        className={styles.playButton}
        type="button"
        onClick={() => void handleToggle()}
      >
        {isPlaying ? t('admin.player.pause') : label}
      </button>
      {hasError ? (
        <span className={styles.errorInline}>{t('admin.player.error')}</span>
      ) : null}
    </div>
  );
}
