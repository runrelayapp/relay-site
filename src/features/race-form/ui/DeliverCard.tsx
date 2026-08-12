import { t } from '@/shared/lib/i18n';
import {
  buildTimeSnaps,
  formatMile,
  formatRaceClock,
  nearestMilestone,
  nearestTimeSnap
} from '../lib/deliver';
import type { PageContext } from '../model/types';

interface DeliverCardProps {
  context: PageContext;
  mileTrigger: number;
  timeTrigger: number;
  onMileChange: (mile: number) => void;
  onTimeChange: (seconds: number) => void;
}

export function DeliverCard({
  context,
  mileTrigger,
  timeTrigger,
  onMileChange,
  onTimeChange
}: DeliverCardProps): React.JSX.Element {
  const timeSnaps = buildTimeSnaps(context.maxTimeSeconds);
  const isTime = context.deliverMode === 'time';

  let pointLabel = '';
  let detail = '';
  let startLabel = t('race.deliver.startMile');
  let endLabel = `Finish · ${formatMile(context.distance)}`;
  let sliderMin = 0;
  let sliderMax = context.distance;
  let sliderStep = 0.1;
  let sliderValue = mileTrigger;
  let ariaValueText: string | undefined;

  if (isTime) {
    const snap = nearestTimeSnap(timeTrigger, context.maxTimeSeconds, timeSnaps);
    pointLabel = snap.isPreset
      ? `${formatRaceClock(snap.seconds)} · ${snap.title}`
      : `${formatRaceClock(timeTrigger)} · ${snap.title}`;
    detail = snap.detail || '\u00a0';
    startLabel = `Start · ${formatRaceClock(0)}`;
    endLabel = `Finish · ${formatRaceClock(context.maxTimeSeconds)}`;
    sliderMin = 0;
    sliderMax = context.maxTimeSeconds;
    sliderStep = context.maxTimeSeconds > 7200 ? 5 : 1;
    sliderValue = timeTrigger;
    ariaValueText = formatRaceClock(timeTrigger);
  } else {
    const snap = nearestMilestone(mileTrigger, context.distance);
    pointLabel = snap.title.startsWith('Mile ')
      ? snap.title
      : `Mile ${formatMile(mileTrigger)} · ${snap.title}`;
    detail = snap.detail || '\u00a0';
  }

  const handleInput = (raw: number): void => {
    if (isTime) {
      const snap = nearestTimeSnap(raw, context.maxTimeSeconds, timeSnaps);
      const windowSec = Math.max(45, Math.round(context.maxTimeSeconds * 0.03));
      if (snap.isPreset && Math.abs(snap.seconds - raw) <= windowSec) {
        onTimeChange(snap.seconds);
      } else {
        onTimeChange(raw);
      }
      return;
    }

    const snapped = nearestMilestone(raw, context.distance);
    const next =
      snapped.mile === raw || Math.abs(snapped.mile - raw) <= 0.75 ? snapped.mile : raw;
    onMileChange(next);
  };

  return (
    <section className="deliver-card card" aria-labelledby="deliver-label">
      <p className="section-label" id="deliver-label">
        {t('race.deliver.label')}
      </p>
      <p className="deliver-summary">
        <span>{pointLabel || '\u00a0'}</span>
        <span>{detail}</span>
      </p>
      <input
        type="range"
        className="deliver-slider"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        aria-valuemin={sliderMin}
        aria-valuemax={sliderMax}
        aria-valuenow={sliderValue}
        aria-valuetext={ariaValueText}
        onChange={(e) => handleInput(Number(e.target.value))}
      />
      <div className="deliver-ticks">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </section>
  );
}
