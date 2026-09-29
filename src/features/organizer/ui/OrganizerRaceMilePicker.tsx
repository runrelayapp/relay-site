import { useCallback, useId, useState } from 'react';
import { t } from '@/shared/lib/i18n';
import {
  clampRaceMile,
  formatMileDistanceValue,
  formatMileMarkerLabel,
  ORGANIZER_RACE_MILE_MAX,
  ORGANIZER_RACE_MILE_MIN,
  ORGANIZER_RACE_MILE_STEP
} from '../lib/raceMessageMile';
import styles from '../styles/organizerMilePicker.module.css';

interface OrganizerRaceMilePickerProps {
  valueMiles: number;
  onChange: (miles: number) => void;
  maxMiles?: number;
}

export function OrganizerRaceMilePicker({
  valueMiles,
  onChange,
  maxMiles = ORGANIZER_RACE_MILE_MAX
}: OrganizerRaceMilePickerProps): React.JSX.Element {
  const labelId = useId();
  const sliderId = useId();
  const max = clampRaceMile(maxMiles);
  const miles = clampRaceMile(valueMiles);
  const [draftInput, setDraftInput] = useState<string | null>(null);

  const commit = useCallback(
    (next: number): void => {
      onChange(clampRaceMile(next));
      setDraftInput(null);
    },
    [onChange]
  );

  const adjust = (delta: number): void => {
    commit(miles + delta);
  };

  const atMin = miles <= ORGANIZER_RACE_MILE_MIN + 0.001;
  const atMax = miles >= max - 0.001;

  const displayInput = draftInput ?? formatMileDistanceValue(miles);

  return (
    <div className={styles.picker} aria-labelledby={labelId}>
      <div className={styles.head}>
        <div className={styles.valueBlock}>
          <div className={styles.value} id={labelId}>
            {formatMileMarkerLabel(miles)}
          </div>
          <div className={styles.subValue}>
            {t('organizer.portal.messages.mileFromStart', {
              miles: formatMileDistanceValue(miles)
            })}
          </div>
        </div>
        <div className={styles.steppers}>
          <button
            className={styles.stepBtn}
            type="button"
            disabled={atMin}
            aria-label={t('organizer.portal.messages.mileDecreaseFine')}
            onClick={() => adjust(-ORGANIZER_RACE_MILE_STEP)}
          >
            −
          </button>
          <button
            className={styles.stepBtn}
            type="button"
            disabled={atMin}
            aria-label={t('organizer.portal.messages.mileDecreaseCoarse')}
            onClick={() => adjust(-1)}
          >
            «
          </button>
          <button
            className={styles.stepBtn}
            type="button"
            disabled={atMax}
            aria-label={t('organizer.portal.messages.mileIncreaseCoarse')}
            onClick={() => adjust(1)}
          >
            »
          </button>
          <button
            className={styles.stepBtn}
            type="button"
            disabled={atMax}
            aria-label={t('organizer.portal.messages.mileIncreaseFine')}
            onClick={() => adjust(ORGANIZER_RACE_MILE_STEP)}
          >
            +
          </button>
        </div>
      </div>

      <input
        id={sliderId}
        className={styles.range}
        type="range"
        min={ORGANIZER_RACE_MILE_MIN}
        max={max}
        step={ORGANIZER_RACE_MILE_STEP}
        value={miles}
        aria-valuemin={ORGANIZER_RACE_MILE_MIN}
        aria-valuemax={max}
        aria-valuenow={miles}
        aria-valuetext={formatMileMarkerLabel(miles)}
        onChange={(event) => commit(Number(event.target.value))}
      />
      <div className={styles.scale}>
        <span>{t('organizer.portal.messages.mileStart')}</span>
        <span>{t('organizer.portal.messages.mileMax', { miles: formatMileDistanceValue(max) })}</span>
      </div>

      <div className={styles.numberRow}>
        <input
          className={styles.numberInput}
          inputMode="decimal"
          aria-label={t('organizer.portal.messages.mileInputLabel')}
          value={displayInput}
          onChange={(event) => setDraftInput(event.target.value)}
          onBlur={() => {
            if (draftInput == null) {
              return;
            }
            commit(Number(draftInput.replace(',', '.')));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit(Number(displayInput.replace(',', '.')));
            }
          }}
        />
        <span className={styles.numberSuffix}>{t('organizer.portal.messages.mileUnit')}</span>
      </div>
    </div>
  );
}
