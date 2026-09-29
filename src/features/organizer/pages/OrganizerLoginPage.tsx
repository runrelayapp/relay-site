import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import adminStyles from '@/features/admin/styles/admin.module.css';
import { AdminLoginSkeleton } from '@/features/admin/ui/AdminSkeletons';
import { useOrganizerSession } from '../hooks/useOrganizerSession';
import { OrganizerForgotPasswordDialog } from '../ui/OrganizerForgotPasswordDialog';
import styles from '../styles/organizer.module.css';

function mapSignInError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return t('organizer.login.error');
  }

  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return t('organizer.login.errorInvalid');
    case 'auth/user-disabled':
      return t('organizer.login.errorDisabled');
    case 'auth/too-many-requests':
      return t('organizer.login.errorTooMany');
    case 'auth/network-request-failed':
      return t('organizer.login.errorNetwork');
    default:
      return t('organizer.login.error');
  }
}

export function OrganizerLoginPage(): React.JSX.Element {
  const session = useOrganizerSession();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const awaitingOrganizerProfileRef = useRef(false);
  const clearedStaleSessionRef = useRef(false);

  // Another portal session (e.g. admin) shares the same Firebase Auth user.
  useEffect(() => {
    if (session.status !== 'forbidden' || clearedStaleSessionRef.current) {
      return;
    }

    if (awaitingOrganizerProfileRef.current) {
      setError(t('organizer.login.forbidden'));
      awaitingOrganizerProfileRef.current = false;
      clearedStaleSessionRef.current = true;
      void session.signOutOrganizer();
      return;
    }

    clearedStaleSessionRef.current = true;
    void session.signOutOrganizer();
  }, [session.status, session.signOutOrganizer]);

  if (session.status === 'loading') {
    return <AdminLoginSkeleton />;
  }

  if (session.status === 'ready') {
    const redirectTo =
      typeof location.state === 'object' &&
      location.state &&
      'from' in location.state &&
      typeof (location.state as { from?: unknown }).from === 'string'
        ? (location.state as { from: string }).from
        : '/organizer';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    awaitingOrganizerProfileRef.current = true;
    clearedStaleSessionRef.current = false;

    try {
      await session.signIn(email, password);
    } catch (err) {
      awaitingOrganizerProfileRef.current = false;
      setError(mapSignInError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={consoleStyles.loginShell}>
      <div className={consoleStyles.loginCard}>
        <p className={consoleStyles.brand}>{t('organizer.console.brand')}</p>
        <h1 className={consoleStyles.heroTitle}>{t('organizer.login.title')}</h1>
        <p className={consoleStyles.subtitle}>{t('organizer.login.lede')}</p>

        {session.status === 'unavailable' ? (
          <p className={adminStyles.error}>{t('organizer.unavailable')}</p>
        ) : null}

        {session.status !== 'unavailable' ? (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="organizer-login-email">
                {t('organizer.login.email')}
              </label>
              <input
                id="organizer-login-email"
                autoComplete="email"
                className={consoleStyles.field}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="organizer-login-password">
                {t('organizer.login.password')}
              </label>
              <input
                id="organizer-login-password"
                autoComplete="current-password"
                className={consoleStyles.field}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className={styles.forgotButton}
                type="button"
                onClick={() => setIsForgotOpen(true)}
              >
                {t('organizer.login.forgotPassword')}
              </button>
            </div>
            {error ? <p className={adminStyles.error}>{error}</p> : null}
            <button className={consoleStyles.primary} disabled={isSubmitting} type="submit">
              {isSubmitting ? t('organizer.loading') : t('organizer.login.submit')}
            </button>
          </form>
        ) : null}
      </div>
      <OrganizerForgotPasswordDialog
        initialEmail={email}
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />
    </div>
  );
}
