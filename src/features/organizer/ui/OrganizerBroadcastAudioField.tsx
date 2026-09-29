import { useEffect, useRef, useState } from 'react';
import { t } from '@/shared/lib/i18n';
import { RELAY_VOICE_UPLOAD_MAX_BYTES } from '@/shared/lib/audio/voiceBlob';
import consoleStyles from '@/shared/styles/console.module.css';
import styles from '../styles/organizer.module.css';

export interface OrganizerBroadcastAudioFieldProps {
  audioFile: File | null;
  existingMediaUrl: string | null;
  isDisabled: boolean;
  onAudioFileChange: (file: File | null) => void;
  onClearExisting: () => void;
  onError: (message: string) => void;
}

export function OrganizerBroadcastAudioField({
  audioFile,
  existingMediaUrl,
  isDisabled,
  onAudioFileChange,
  onClearExisting,
  onError
}: OrganizerBroadcastAudioFieldProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setPreviewUrl(null);
    return undefined;
  }, [audioFile]);

  useEffect(() => {
    setIsPlaying(false);
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [previewUrl, existingMediaUrl]);

  const playbackSrc = previewUrl ?? existingMediaUrl;
  const hasAttachment = audioFile != null || (existingMediaUrl != null && existingMediaUrl.length > 0);
  const fileLabel = audioFile?.name ?? t('organizer.portal.messages.audioAttached');

  const handlePickClick = (): void => {
    onError('');
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onError('');
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|m4a|aac|ogg|webm)$/i)) {
      onError(t('organizer.portal.messages.audioInvalid'));
      return;
    }
    if (file.size > RELAY_VOICE_UPLOAD_MAX_BYTES) {
      onError(t('organizer.portal.messages.audioTooLarge'));
      return;
    }
    onAudioFileChange(file);
  };

  const handleRemove = (): void => {
    onError('');
    onAudioFileChange(null);
    if (existingMediaUrl) {
      onClearExisting();
    }
  };

  const handlePlayToggle = async (): Promise<void> => {
    const audio = previewAudioRef.current;
    if (!audio || !playbackSrc) {
      return;
    }
    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      onError(t('organizer.portal.messages.audioPlayFailed'));
    }
  };

  return (
    <div className={styles.broadcastAudio}>
      <input
        ref={inputRef}
        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.webm"
        className={styles.broadcastAudioInput}
        disabled={isDisabled}
        type="file"
        onChange={handleFileChange}
      />
      {!hasAttachment ? (
        <button
          className={`${consoleStyles.secondary} ${consoleStyles.secondaryFull}`}
          disabled={isDisabled}
          type="button"
          onClick={handlePickClick}
        >
          {t('organizer.portal.messages.addAudio')}
        </button>
      ) : (
        <div className={styles.broadcastAudioRow}>
          <span className={styles.broadcastAudioName}>{fileLabel}</span>
          <div className={styles.broadcastAudioActions}>
            <button
              className={consoleStyles.smallBtn}
              disabled={isDisabled || !playbackSrc}
              type="button"
              onClick={() => void handlePlayToggle()}
            >
              {isPlaying
                ? t('organizer.portal.messages.audioPause')
                : t('organizer.portal.messages.audioPlay')}
            </button>
            <button
              className={`${consoleStyles.smallBtn} ${consoleStyles.smallBtnDelete}`}
              disabled={isDisabled}
              type="button"
              onClick={handleRemove}
            >
              {t('organizer.portal.messages.audioRemove')}
            </button>
            <button
              className={consoleStyles.smallBtn}
              disabled={isDisabled}
              type="button"
              onClick={handlePickClick}
            >
              {t('organizer.portal.messages.audioReplace')}
            </button>
          </div>
        </div>
      )}
      {playbackSrc ? (
        <audio
          ref={previewAudioRef}
          hidden
          preload="metadata"
          src={playbackSrc}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      ) : null}
    </div>
  );
}
