import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';

interface OrganizerResetPasswordFormProps {
  oobCode: string;
}

type FormStatus = 'loading' | 'ready' | 'success' | 'invalid';

export function OrganizerResetPasswordForm({
  oobCode
}: OrganizerResetPasswordFormProps): React.JSX.Element {
  const [status, setStatus] = useState<FormStatus>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;
    void verifyPasswordResetCode(firebaseCtx.auth, oobCode)
      .then(() => {
        if (!cancelled) {
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('invalid');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      setFormError(t('reset.organizer.invalid'));
      return;
    }

    if (password.length < 6) {
      setFormError(t('reset.organizer.tooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t('reset.organizer.mismatch'));
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await confirmPasswordReset(firebaseCtx.auth, oobCode, password);
      setStatus('success');
    } catch {
      setFormError(t('reset.organizer.expired'));
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return <p className="reset-password__status">{t('reset.organizer.loading')}</p>;
  }

  if (status === 'invalid') {
    return (
      <div className="reset-password__card">
        <p className="reset-password__status">{t('reset.organizer.invalid')}</p>
        <Link className="reset-password__button" to="/organizer/login">
          {t('reset.organizer.goToLogin')}
        </Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="reset-password__card">
        <p className="reset-password__status">{t('reset.organizer.success')}</p>
        <Link className="reset-password__button" to="/organizer/login">
          {t('reset.organizer.goToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form className="reset-password__card" onSubmit={(event) => void handleSubmit(event)}>
      <h1 className="reset-password__title">{t('reset.organizer.title')}</h1>
      <p className="reset-password__lede">{t('reset.organizer.lede')}</p>
      <label className="reset-password__label" htmlFor="organizer-reset-password">
        {t('reset.organizer.password')}
      </label>
      <input
        id="organizer-reset-password"
        autoComplete="new-password"
        className="reset-password__field"
        minLength={6}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <label className="reset-password__label" htmlFor="organizer-reset-confirm">
        {t('reset.organizer.confirm')}
      </label>
      <input
        id="organizer-reset-confirm"
        autoComplete="new-password"
        className="reset-password__field"
        minLength={6}
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      {formError ? <p className="reset-password__error">{formError}</p> : null}
      <button className="reset-password__button" disabled={isSaving} type="submit">
        {isSaving ? t('reset.organizer.saving') : t('reset.organizer.submit')}
      </button>
    </form>
  );
}
