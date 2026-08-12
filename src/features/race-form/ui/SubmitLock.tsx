import { t } from '@/shared/lib/i18n';

export type SubmitLockMode = 'hidden' | 'sending' | 'error';

interface SubmitLockProps {
  mode: SubmitLockMode;
  errorMessage: string;
  onDismiss: () => void;
}

export function SubmitLock({
  mode,
  errorMessage,
  onDismiss
}: SubmitLockProps): React.JSX.Element {
  const isVisible = mode !== 'hidden';
  const isSending = mode === 'sending';
  const isError = mode === 'error';

  return (
    <div
      id="form-submit-lock"
      className="form-submit-lock"
      hidden={!isVisible}
      aria-hidden={!isVisible}
    >
      <div className="form-submit-lock__panel">
        <span
          className="spinner form-submit-lock__spinner"
          aria-hidden="true"
          hidden={!isSending}
        />
        <p className="form-submit-lock__label" hidden={!isSending}>
          {t('race.submit.sending')}
        </p>
        <p className="form-submit-lock__error" hidden={!isError} role="alert">
          {errorMessage}
        </p>
        <button
          type="button"
          className="btn btn--secondary form-submit-lock__dismiss"
          hidden={!isError}
          onClick={onDismiss}
        >
          {t('race.submit.lockDismiss')}
        </button>
      </div>
    </div>
  );
}
