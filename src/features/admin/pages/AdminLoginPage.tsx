import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import adminStyles from '../styles/admin.module.css';
import { useAdminSession } from '../hooks/useAdminSession';
import { AdminLoginSkeleton } from '../ui/AdminSkeletons';

function mapSignInError(
  error: unknown,
  source: 'password' | 'google' = 'password'
): string {
  if (!(error instanceof FirebaseError)) {
    return source === 'google' ? t('admin.login.errorGoogle') : t('admin.login.error');
  }

  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return t('admin.login.errorInvalid');
    case 'auth/user-disabled':
      return t('admin.login.errorDisabled');
    case 'auth/too-many-requests':
      return t('admin.login.errorTooMany');
    case 'auth/network-request-failed':
      return t('admin.login.errorNetwork');
    case 'auth/unauthorized-domain':
      return t('admin.login.errorDomain');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return t('admin.login.errorGoogleCancelled');
    case 'auth/popup-blocked':
      return t('admin.login.errorGooglePopup');
    case 'auth/account-exists-with-different-credential':
      return t('admin.login.errorGoogleExists');
    default:
      if (source === 'google') {
        return t('admin.login.errorGoogle');
      }
      return `${t('admin.login.error')} (${t('admin.login.errorCode', { code: error.code })})`;
  }
}

export function AdminLoginPage(): React.JSX.Element {
  const session = useAdminSession();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const isBusy = isSubmitting || isGoogleSubmitting;

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
        : '/admin';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await session.signIn(email, password);
    } catch (err) {
      setError(mapSignInError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setError('');
    setIsGoogleSubmitting(true);

    try {
      await session.signInWithGoogle();
    } catch (err) {
      setError(mapSignInError(err, 'google'));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleCopyUid = async (): Promise<void> => {
    const uid = session.user?.uid;
    if (!uid) {
      return;
    }
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={consoleStyles.loginShell}>
      <div className={consoleStyles.loginCard}>
        <p className={consoleStyles.brand}>{t('admin.console.brand')}</p>
        <h1 className={consoleStyles.heroTitle}>{t('admin.login.title')}</h1>
        <p className={consoleStyles.subtitle}>{t('admin.login.lede')}</p>

        {session.status === 'unavailable' ? (
          <p className={adminStyles.error}>{t('admin.unavailable')}</p>
        ) : null}

        {session.status === 'forbidden' ? (
          <div className={adminStyles.forbiddenBox}>
            <p className={adminStyles.error}>{t('admin.forbidden')}</p>
            <p className={adminStyles.mutedInline}>{t('admin.forbiddenHint')}</p>
            <p className={adminStyles.uidLabel}>{t('admin.forbiddenUid')}</p>
            <code className={adminStyles.uidCode}>{session.user?.uid}</code>
            <button
              className={adminStyles.ghostButtonCompact}
              type="button"
              onClick={() => void handleCopyUid()}
            >
              {copied ? t('admin.forbiddenCopied') : t('admin.forbiddenCopyUid')}
            </button>
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className={consoleStyles.fieldGroup}>
            <label className={consoleStyles.fieldLabel} htmlFor="admin-email">
              {t('admin.login.email')}
            </label>
            <input
              autoComplete="username"
              className={consoleStyles.field}
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className={consoleStyles.fieldGroup}>
            <label className={consoleStyles.fieldLabel} htmlFor="admin-password">
              {t('admin.login.password')}
            </label>
            <input
              autoComplete="current-password"
              className={consoleStyles.field}
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? <p className={adminStyles.error}>{error}</p> : null}

          <button
            className={consoleStyles.primary}
            disabled={isBusy || session.status === 'unavailable'}
            type="submit"
          >
            {isSubmitting ? t('admin.login.submitting') : t('admin.login.submit')}
          </button>
        </form>

        {session.status === 'forbidden' ? null : (
          <>
            <div className={consoleStyles.loginDivider}>{t('admin.login.or')}</div>
            <button
              className={`${consoleStyles.secondary} ${consoleStyles.loginOauth}`}
              disabled={isBusy || session.status === 'unavailable'}
              type="button"
              onClick={() => void handleGoogleSignIn()}
            >
              {isGoogleSubmitting
                ? t('admin.login.googleSubmitting')
                : t('admin.login.google')}
            </button>
          </>
        )}

        {session.status === 'forbidden' ? (
          <button
            className={`${consoleStyles.secondary} ${consoleStyles.loginSecondaryFull}`}
            type="button"
            onClick={() => void session.signOutAdmin()}
          >
            {t('admin.signOut')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
