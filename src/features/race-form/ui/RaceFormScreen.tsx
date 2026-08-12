import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppConfig } from '@/shared/config/env';
import type { FirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import {
  buildTimeSnaps,
  formatMile,
  formatRaceClock,
  nearestMilestone,
  nearestTimeSnap
} from '../lib/deliver';
import { mapSubmitErrorMessage } from '../lib/errors';
import { shutdownFirestore, submitEvent } from '../lib/submit-event';
import type { MessageFormat, MusicTrack, PageContext } from '../model/types';
import { BrandHeader } from './BrandHeader';
import { DeliverCard } from './DeliverCard';
import { FormatTabs } from './FormatTabs';
import { SongPanel } from './SongPanel';
import { SubmitLock, type SubmitLockMode } from './SubmitLock';
import { TextPanel } from './TextPanel';
import { VoicePanel } from './VoicePanel';

interface RaceFormScreenProps {
  context: PageContext;
  firebaseCtx: FirebaseContext | null;
  runnerName: string;
}

export function RaceFormScreen({
  context,
  firebaseCtx,
  runnerName
}: RaceFormScreenProps): React.JSX.Element {
  const navigate = useNavigate();
  const config = useMemo(() => getAppConfig(), []);

  const [activeFormat, setActiveFormat] = useState<MessageFormat>('song');
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [textContent, setTextContent] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [errorBanner, setErrorBanner] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLockMode, setSubmitLockMode] = useState<SubmitLockMode>('hidden');
  const [submitLockError, setSubmitLockError] = useState('');

  const initialTriggers = useMemo(() => {
    if (context.deliverMode === 'time') {
      const snaps = buildTimeSnaps(context.maxTimeSeconds);
      const defaultSnap =
        snaps.find((s) => s.title === 'The grind') ?? snaps[snaps.length - 2];
      return {
        mileTrigger: 0,
        timeTrigger: defaultSnap?.seconds ?? Math.round(context.maxTimeSeconds * 0.75)
      };
    }
    return { mileTrigger: 0, timeTrigger: 0 };
  }, [context.deliverMode, context.maxTimeSeconds]);

  const [mileTrigger, setMileTrigger] = useState(initialTriggers.mileTrigger);
  const [timeTrigger, setTimeTrigger] = useState(initialTriggers.timeTrigger);

  useEffect(() => {
    setMileTrigger(initialTriggers.mileTrigger);
    setTimeTrigger(initialTriggers.timeTrigger);
  }, [initialTriggers]);

  useEffect(() => {
    const snapMile = (): void => {
      if (context.deliverMode !== 'mile') {
        return;
      }
      const snap = nearestMilestone(mileTrigger, context.distance);
      if (Math.abs(snap.mile - mileTrigger) <= 0.75 && snap.title !== `Mile ${formatMile(mileTrigger)}`) {
        setMileTrigger(snap.mile);
      }
    };
    snapMile();
  }, [context.deliverMode, context.distance, mileTrigger]);

  useEffect(() => {
    if (context.deliverMode !== 'time') {
      return;
    }
    const snaps = buildTimeSnaps(context.maxTimeSeconds);
    const snap = nearestTimeSnap(timeTrigger, context.maxTimeSeconds, snaps);
    const windowSec = Math.max(45, Math.round(context.maxTimeSeconds * 0.03));
    if (snap.isPreset && Math.abs(snap.seconds - timeTrigger) <= windowSec) {
      if (snap.seconds !== timeTrigger) {
        setTimeTrigger(snap.seconds);
      }
    }
  }, [context.deliverMode, context.maxTimeSeconds, timeTrigger]);

  useEffect(() => {
    document.body.style.overflow = submitLockMode !== 'hidden' ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [submitLockMode]);

  const footerNote =
    context.deliverMode === 'time'
      ? t('race.footer.time', { time: formatRaceClock(timeTrigger) })
      : t('race.footer.mile', { mile: formatMile(mileTrigger) });

  const handleFormatChange = (format: MessageFormat): void => {
    setActiveFormat(format);
    setErrorBanner('');
  };

  const handleDismissLock = (): void => {
    setSubmitLockMode('hidden');
    setSubmitLockError('');
    setIsSubmitting(false);
  };

  const handleSubmit = async (): Promise<void> => {
    setErrorBanner('');
    if (isSubmitting) {
      return;
    }

    if (activeFormat === 'voice' && !voiceBlob) {
      setErrorBanner(t('race.voice.needRecording'));
      return;
    }
    if (activeFormat === 'text' && !textContent.trim()) {
      setErrorBanner(t('race.text.needMessage'));
      return;
    }
    if (activeFormat === 'song' && !selectedTrack) {
      setErrorBanner(t('race.song.needTrack'));
      return;
    }
    if (activeFormat === 'song' && selectedTrack && !selectedTrack.previewUrl) {
      setErrorBanner(t('race.song.needPreview'));
      return;
    }

    setIsSubmitting(true);
    setSubmitLockMode('sending');
    setSubmitLockError('');

    try {
      const result = await submitEvent(firebaseCtx, {
        format: activeFormat,
        mileTrigger: context.deliverMode === 'mile' ? mileTrigger : undefined,
        timeTrigger: context.deliverMode === 'time' ? timeTrigger : undefined,
        context: { ...context, name: runnerName },
        textContent: activeFormat === 'text' ? textContent.trim() : undefined,
        track: activeFormat === 'song' ? selectedTrack ?? undefined : undefined,
        voiceBlob: activeFormat === 'voice' ? voiceBlob ?? undefined : undefined
      });
      await shutdownFirestore(firebaseCtx);
      navigate(`/sent?event=${encodeURIComponent(result.eventId)}`, { replace: true });
    } catch (err) {
      console.error('[relay webform] send failed', err);
      const message = mapSubmitErrorMessage(err);
      setErrorBanner(message);
      setSubmitLockError(message);
      setSubmitLockMode('error');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page" id="app">
      <BrandHeader />

      <div
        id="race-form"
        inert={submitLockMode !== 'hidden' ? true : undefined}
        aria-busy={submitLockMode === 'sending' ? 'true' : 'false'}
      >
        <p className="eyebrow">{t('race.greeting.eyebrow')}</p>
        <h1 className="headline">
          {runnerName}, running {context.race}.
        </h1>
        <p className="lede">
          {context.deliverMode === 'time'
            ? t('race.greeting.lede.time')
            : t('race.greeting.lede.mile')}
        </p>

        <FormatTabs activeFormat={activeFormat} onChange={handleFormatChange} />

        {errorBanner ? (
          <div className="error-banner" role="alert">
            {errorBanner}
          </div>
        ) : (
          <div className="error-banner" hidden role="alert" />
        )}

        <VoicePanel
          isActive={activeFormat === 'voice'}
          maxVoiceSeconds={config.maxVoiceSeconds}
          voiceBlob={voiceBlob}
          onVoiceBlobChange={setVoiceBlob}
          onError={setErrorBanner}
        />
        <TextPanel
          isActive={activeFormat === 'text'}
          value={textContent}
          maxLength={config.maxTextLength}
          onChange={setTextContent}
        />
        <SongPanel
          isActive={activeFormat === 'song'}
          config={config}
          selectedTrack={selectedTrack}
          onSelectTrack={setSelectedTrack}
          onError={setErrorBanner}
        />

        <DeliverCard
          context={context}
          mileTrigger={mileTrigger}
          timeTrigger={timeTrigger}
          onMileChange={setMileTrigger}
          onTimeChange={setTimeTrigger}
        />

        <button
          type="button"
          className="btn btn--primary"
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
        >
          <span>
            {isSubmitting ? (
              <>
                <span className="spinner" aria-hidden="true" /> {t('race.submit.sending')}
              </>
            ) : (
              t('race.submit')
            )}
          </span>
        </button>
        <p className="footer-note">{footerNote}</p>
      </div>

      <SubmitLock
        mode={submitLockMode}
        errorMessage={submitLockError}
        onDismiss={handleDismissLock}
      />
    </main>
  );
}
