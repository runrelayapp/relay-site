import { useId } from 'react';
import { t } from '@/shared/lib/i18n';
import {
  clampEventDistanceMiles,
  formatEventDistanceMiles,
  ORGANIZER_EVENT_DISTANCE_MAX,
  ORGANIZER_EVENT_DISTANCE_MIN,
  ORGANIZER_EVENT_DISTANCE_STEP
} from '../lib/eventDistance';
import styles from '../styles/organizerEventDistanceField.module.css';

interface OrganizerEventDistanceFieldProps {
  valueMiles: number;
  onChange: (miles: number) => void;
}

export function OrganizerEventDistanceField({
  valueMiles,
  onChange
}: OrganizerEventDistanceFieldProps): React.JSX.Element {
  const sliderId = useId();
  const miles = clampEventDistanceMiles(valueMiles);
  const atMin = miles <= ORGANIZER_EVENT_DISTANCE_MIN + 0.001;
  const atMax = miles >= ORGANIZER_EVENT_DISTANCE_MAX - 0.001;

  const adjust = (delta: number): void => {
    onChange(clampEventDistanceMiles(miles + delta));
  };

  return (
    <div className={styles.compact}>
      <div className={styles.row}>
        <span className={styles.value}>
          {t('organizer.events.distanceValue', { miles: formatEventDistanceMiles(miles) })}
        </span>
        <div className={styles.steppers}>
          <button
            className={styles.stepBtn}
            type="button"
            disabled={atMin}
            aria-label={t('organizer.events.distanceDecrease')}
            onClick={() => adjust(-ORGANIZER_EVENT_DISTANCE_STEP)}
          >
            −
          </button>
          <button
            className={styles.stepBtn}
            type="button"
            disabled={atMax}
            aria-label={t('organizer.events.distanceIncrease')}
            onClick={() => adjust(ORGANIZER_EVENT_DISTANCE_STEP)}
          >
            +
          </button>
        </div>
      </div>
      <input
        id={sliderId}
        className={styles.range}
        type="range"
        min={ORGANIZER_EVENT_DISTANCE_MIN}
        max={ORGANIZER_EVENT_DISTANCE_MAX}
        step={ORGANIZER_EVENT_DISTANCE_STEP}
        value={miles}
        aria-valuemin={ORGANIZER_EVENT_DISTANCE_MIN}
        aria-valuemax={ORGANIZER_EVENT_DISTANCE_MAX}
        aria-valuenow={miles}
        aria-valuetext={t('organizer.events.distanceValue', {
          miles: formatEventDistanceMiles(miles)
        })}
        onChange={(event) => onChange(clampEventDistanceMiles(Number(event.target.value)))}
      />
    </div>
  );
}
