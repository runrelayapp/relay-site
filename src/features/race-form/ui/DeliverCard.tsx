import { t } from '@/shared/lib/i18n';
import {
  buildTimeSnaps,
  formatMile,
  formatRaceClock,
  nearestMilestone,
  nearestTimeSnap
} from '../lib/deliver';
import {
  clampPercent,
  mileToPercent,
  percentToMile,
  percentToTime,
  timeToPercent
} from '../lib/deliver-percent';
import type { RaceDeliveryMark } from '../lib/list-race-delivery-marks';
import type { PageContext } from '../model/types';

interface DeliverCardProps {
  context: PageContext;
  mileTrigger: number;
  timeTrigger: number;
  occupiedMarks: RaceDeliveryMark[];
  onMileChange: (mile: number) => void;
  onTimeChange: (seconds: number) => void;
}

export function DeliverCard({
  context,
  mileTrigger,
  timeTrigger,
  occupiedMarks,
  onMileChange,
  onTimeChange
}: DeliverCardProps): React.JSX.Element {
  const timeSnaps = buildTimeSnaps(context.maxTimeSeconds);
  const isTime = context.deliverMode === 'time';

  const sliderValue = isTime
    ? timeToPercent(timeTrigger, context.maxTimeSeconds)
    : mileToPercent(mileTrigger, context.distance);

  const occupiedPercents = occupiedMarks
    .map((mark) => {
      if (isTime) {
        return typeof mark.timeTrigger === 'number'
          ? timeToPercent(mark.timeTrigger, context.maxTimeSeconds)
          : null;
      }
      return typeof mark.mileTrigger === 'number'
        ? mileToPercent(mark.mileTrigger, context.distance)
        : null;
    })
    .filter((percent): percent is number => percent !== null);

  let pointLabel = '';
  let detail = '';
  let startLabel = t('race.deliver.startMile');
  let endLabel = `Finish · ${formatMile(context.distance)}`;
  let ariaValueText: string | undefined;

  if (isTime) {
    const snap = nearestTimeSnap(timeTrigger, context.maxTimeSeconds, timeSnaps);
    pointLabel = `${formatRaceClock(timeTrigger)} · ${snap.title}`;
    detail = snap.detail;
    startLabel = `Start · ${formatRaceClock(0)}`;
    endLabel = `Finish · ${formatRaceClock(context.maxTimeSeconds)}`;
    ariaValueText = formatRaceClock(timeTrigger);
  } else {
    const snap = nearestMilestone(mileTrigger, context.distance);
    pointLabel = snap.title.startsWith('Mile ')
      ? snap.title
      : `Mile ${formatMile(mileTrigger)} · ${snap.title}`;
    detail = snap.detail;
    ariaValueText = `Mile ${formatMile(mileTrigger)}`;
  }

  const handleInput = (percent: number): void => {
    const nextPercent = clampPercent(percent);
    if (isTime) {
      onTimeChange(percentToTime(nextPercent, context.maxTimeSeconds));
      return;
    }
    onMileChange(percentToMile(nextPercent, context.distance));
  };

  return (
    <section className="deliver-card card" aria-labelledby="deliver-label">
      <p className="section-label" id="deliver-label">
        {t('race.deliver.label')}
      </p>
      <p className="deliver-summary">
        <span className="deliver-summary__point">{pointLabel || '\u00a0'}</span>
        {detail.trim() ? (
          <span className="deliver-summary__detail">{detail}</span>
        ) : null}
      </p>
      {occupiedPercents.length > 0 ? (
        <p className="deliver-occupied-hint">{t('race.deliver.occupiedHint')}</p>
      ) : null}
      <div className="deliver-track">
        <div className="deliver-rail" aria-hidden="true" />
        <div className="deliver-markers" aria-hidden="true">
          {occupiedPercents.map((percent, index) => (
            <span
              key={`${percent}-${index}`}
              className="deliver-marker"
              style={{ left: `${percent}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          className="deliver-slider"
          min={0}
          max={100}
          step={1}
          value={sliderValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sliderValue}
          aria-valuetext={ariaValueText}
          onChange={(e) => handleInput(Number(e.target.value))}
        />
      </div>
      <div className="deliver-ticks">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </section>
  );
}
