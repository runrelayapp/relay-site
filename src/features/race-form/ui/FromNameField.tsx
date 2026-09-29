import { t } from '@/shared/lib/i18n';

interface FromNameFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const FROM_NAME_MAX_LENGTH = 40;

export function FromNameField({
  value,
  error,
  onChange
}: FromNameFieldProps): React.JSX.Element {
  const errorId = 'from-name-error';
  const hasError = Boolean(error);

  return (
    <div className={`from-name-field${hasError ? ' from-name-field--error' : ''}`}>
      <label className="section-label" htmlFor="from-name-input">
        {t('race.fromName.label')}
      </label>
      <input
        id="from-name-input"
        className="from-name-input"
        type="text"
        autoComplete="name"
        enterKeyHint="done"
        maxLength={FROM_NAME_MAX_LENGTH}
        placeholder={t('race.fromName.placeholder')}
        required
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, FROM_NAME_MAX_LENGTH))}
      />
      {hasError ? (
        <p className="from-name-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
