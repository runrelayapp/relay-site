import { useEffect, useState, type FormEvent } from 'react';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import { Dialog, dialogStyles } from '@/shared/ui/dialog';
import consoleStyles from '@/shared/styles/console.module.css';
import { sendOrganizerPasswordReset } from '../api/organizerPasswordReset';
import styles from '../styles/organizer.module.css';

interface OrganizerForgotPasswordDialogProps {
  initialEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OrganizerForgotPasswordDialog({
  initialEmail,
  isOpen,
  onClose
}: OrganizerForgotPasswordDialogProps): React.JSX.Element {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEmail(initialEmail.trim());
    setError('');
    setNotice('');
    setIsSending(false);
  }, [initialEmail, isOpen]);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const firebaseCtx = getFirebaseContext();
    const normalized = email.trim().toLowerCase();

    if (!firebaseCtx) {
      setNotice('');
      setError(t('organizer.unavailable'));
      return;
    }

    if (!normalized.includes('@')) {
      setNotice('');
      setError(t('organizer.login.forgotInvalidEmail'));
      return;
    }

    setIsSending(true);
    setError('');
    setNotice('');
    try {
      await sendOrganizerPasswordReset(firebaseCtx, normalized);
      setNotice(t('organizer.login.forgotSent'));
    } catch {
      setNotice(t('organizer.login.forgotSent'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      closeLabel={t('organizer.login.forgotCancel')}
      description={t('organizer.login.forgotLede')}
      isOpen={isOpen}
      title={t('organizer.login.forgotTitle')}
      onClose={onClose}
      actions={
        <>
          <button
            className={dialogStyles.primaryButton}
            disabled={isSending}
            form="organizer-forgot-password-form"
            type="submit"
          >
            {isSending ? t('organizer.loading') : t('organizer.login.forgotSubmit')}
          </button>
          <button
            className={dialogStyles.ghostButton}
            disabled={isSending}
            type="button"
            onClick={onClose}
          >
            {t('organizer.login.forgotCancel')}
          </button>
        </>
      }
    >
      <form
        className={styles.dialogForm}
        id="organizer-forgot-password-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className={consoleStyles.fieldGroup}>
          <label
            className={consoleStyles.fieldLabel}
            htmlFor="organizer-forgot-email"
          >
            {t('organizer.login.email')}
          </label>
          <input
            id="organizer-forgot-email"
            autoComplete="email"
            className={consoleStyles.field}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {notice ? <p className={styles.forgotNotice}>{notice}</p> : null}
        {error ? <p className={styles.forgotError}>{error}</p> : null}
      </form>
    </Dialog>
  );
}
