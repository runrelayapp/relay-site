import { useEffect, useState, type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import {
  deleteAdminOrganizer,
  fetchAdminOrganizer,
  sendAdminOrganizerPasswordReset,
  upsertAdminOrganizer
} from '../api/adminOrganizersRepository';
import { ADMIN_CACHE_KEYS, peekAdminCache } from '../lib/adminCache';
import type { AdminOrganizer } from '../model/types';
import { AdminShell } from '../ui/AdminShell';
import styles from '../styles/admin.module.css';

export function AdminOrganizerDetailPage(): React.JSX.Element {
  const { organizerId: routeId } = useParams<{ organizerId: string }>();
  const navigate = useNavigate();
  const organizerId = routeId?.trim() ?? '';
  const cachedOrganizer =
    peekAdminCache<AdminOrganizer>(ADMIN_CACHE_KEYS.organizer(organizerId)) ??
    peekAdminCache<AdminOrganizer[]>(ADMIN_CACHE_KEYS.organizersList)?.find(
      (item) => item.id === organizerId
    ) ??
    null;
  const [name, setName] = useState(cachedOrganizer?.name ?? '');
  const [email, setEmail] = useState(cachedOrganizer?.email ?? '');
  const [userId, setUserId] = useState(cachedOrganizer?.userId ?? '');
  const [notes, setNotes] = useState(cachedOrganizer?.notes ?? '');
  const [authUid, setAuthUid] = useState(cachedOrganizer?.authUid ?? '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(cachedOrganizer == null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !organizerId) {
      setIsLoading(false);
      setError(t('admin.organizers.notFound'));
      return;
    }

    let cancelled = false;
    void fetchAdminOrganizer(firebaseCtx, organizerId, { force: true })
      .then((item) => {
        if (cancelled) {
          return;
        }
        if (!item) {
          setError(t('admin.organizers.notFound'));
          return;
        }
        setName(item.name);
        setEmail(item.email ?? '');
        setUserId(item.userId ?? '');
        setNotes(item.notes);
        setAuthUid(item.authUid ?? '');
        setError('');
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('admin.organizers.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizerId]);

  const handleSave = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !organizerId) {
      return;
    }

    if (!name.trim()) {
      setError(t('admin.organizers.validation'));
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      await upsertAdminOrganizer(firebaseCtx, {
        id: organizerId,
        name,
        email,
        userId,
        notes
      });
    } catch {
      setError(t('admin.organizers.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !organizerId) {
      return;
    }
    if (!window.confirm(t('admin.organizers.deleteConfirm'))) {
      return;
    }

    setIsSaving(true);
    try {
      await deleteAdminOrganizer(firebaseCtx, organizerId);
      void navigate('/admin/organizers');
    } catch {
      setError(t('admin.organizers.deleteError'));
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    const resetEmail = email.trim().toLowerCase();
    if (!firebaseCtx || !organizerId) {
      return;
    }

    if (!resetEmail.includes('@')) {
      setNotice('');
      setError(t('admin.organizers.resetPasswordNoEmail'));
      return;
    }

    if (!window.confirm(t('admin.organizers.resetPasswordConfirm'))) {
      return;
    }

    setIsResettingPassword(true);
    setError('');
    setNotice('');
    try {
      await sendAdminOrganizerPasswordReset(firebaseCtx, resetEmail);
      setNotice(t('admin.organizers.resetPasswordSent'));
    } catch (resetError) {
      if (
        resetError instanceof FirebaseError &&
        resetError.code === 'auth/user-not-found'
      ) {
        setError(t('admin.organizers.resetPasswordNoAuth'));
      } else {
        setError(t('admin.organizers.resetPasswordError'));
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <AdminShell title={name || t('admin.organizers.title')}>
      <Link className={styles.backLink} to="/admin/organizers">
        {t('admin.organizers.back')}
      </Link>
      {isLoading ? <p className={styles.muted}>{t('admin.loading')}</p> : null}
      {!isLoading ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('admin.organizers.editTitle')}</h2>
          <form className={styles.stackForm} onSubmit={(event) => void handleSave(event)}>
            <label className={styles.label} htmlFor="organizer-name">
              {t('admin.organizers.field.name')}
            </label>
            <input
              id="organizer-name"
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label className={styles.label} htmlFor="organizer-email">
              {t('admin.organizers.field.email')}
            </label>
            <input
              id="organizer-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label className={styles.label} htmlFor="organizer-uid">
              {t('admin.organizers.field.userId')}
            </label>
            <input
              id="organizer-uid"
              className={styles.input}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
            <label className={styles.label} htmlFor="organizer-notes">
              {t('admin.organizers.field.notes')}
            </label>
            <textarea
              id="organizer-notes"
              className={styles.textarea}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
            />
            <p className={styles.mutedInline}>
              {t('admin.organizers.field.id')}: <code className={styles.codeSmall}>{organizerId}</code>
            </p>
            {authUid ? (
              <p className={styles.mutedInline}>
                {t('admin.organizers.field.authUid')}:{' '}
                <code className={styles.codeSmall}>{authUid}</code>
              </p>
            ) : null}
            <p className={styles.muted}>{t('admin.organizers.portalHint')}</p>
            <div className={styles.topActions}>
              <button
                className={styles.primaryButtonCompact}
                disabled={isSaving || isResettingPassword}
                type="submit"
              >
                {isSaving ? t('admin.loading') : t('admin.organizers.save')}
              </button>
              <button
                className={styles.ghostButtonCompact}
                disabled={isSaving || isResettingPassword}
                type="button"
                onClick={() => void handleResetPassword()}
              >
                {isResettingPassword
                  ? t('admin.loading')
                  : t('admin.organizers.resetPassword')}
              </button>
              <button
                className={styles.dangerButtonCompact}
                disabled={isSaving || isResettingPassword}
                type="button"
                onClick={() => void handleDelete()}
              >
                {t('admin.organizers.delete')}
              </button>
            </div>
          </form>
          {notice ? <p className={styles.muted}>{notice}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>
      ) : null}
    </AdminShell>
  );
}
