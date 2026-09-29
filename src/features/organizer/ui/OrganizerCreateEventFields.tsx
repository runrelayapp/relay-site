import consoleStyles from '@/shared/styles/console.module.css';
import { t } from '@/shared/lib/i18n';
import adminStyles from '@/features/admin/styles/admin.module.css';
import { OrganizerEventDistanceField } from './OrganizerEventDistanceField';

export interface OrganizerCreateEventFieldsProps {
  name: string;
  eventDate: string;
  distanceMiles: number;
  formError: string;
  nameInputId: string;
  dateInputId: string;
  onNameChange: (value: string) => void;
  onEventDateChange: (value: string) => void;
  onDistanceChange: (miles: number) => void;
}

export function OrganizerCreateEventFields({
  name,
  eventDate,
  distanceMiles,
  formError,
  nameInputId,
  dateInputId,
  onNameChange,
  onEventDateChange,
  onDistanceChange
}: OrganizerCreateEventFieldsProps): React.JSX.Element {
  return (
    <>
      <p className={consoleStyles.helper}>{t('organizer.events.createHint')}</p>
      <div className={consoleStyles.fieldGroup}>
        <label className={consoleStyles.fieldLabel} htmlFor={nameInputId}>
          {t('organizer.events.field.name')}
        </label>
        <input
          id={nameInputId}
          className={consoleStyles.field}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t('organizer.events.placeholder.name')}
        />
      </div>
      <div className={consoleStyles.fieldGroup}>
        <label className={consoleStyles.fieldLabel} htmlFor={dateInputId}>
          {t('organizer.events.field.date')}
        </label>
        <input
          id={dateInputId}
          className={consoleStyles.field}
          type="date"
          value={eventDate}
          onChange={(event) => onEventDateChange(event.target.value)}
        />
      </div>
      <div className={consoleStyles.fieldGroup}>
        <span className={consoleStyles.fieldLabel}>{t('organizer.events.field.distance')}</span>
        <OrganizerEventDistanceField valueMiles={distanceMiles} onChange={onDistanceChange} />
      </div>
      {formError ? <p className={adminStyles.error}>{formError}</p> : null}
    </>
  );
}
