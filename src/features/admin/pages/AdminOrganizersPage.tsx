import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { getFirebaseContext } from '@/shared/firebase';
import { isEmailInUseWrongPasswordError } from '@/shared/firebase/createSecondaryAuthUser';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { SkeletonStack } from '@/shared/ui/skeleton';
import {
  createAdminOrganizerWithAuth,
  deleteAdminOrganizer,
  fetchAdminOrganizer,
  listAdminOrganizersPage,
  searchAdminOrganizers,
  sendAdminOrganizerPasswordReset,
  upsertAdminOrganizer
} from '../api/adminOrganizersRepository';
import { listAdminEventCodes } from '../api/adminEventCodesRepository';
import {
  fetchAdminOrganizerRowStatsMap,
  type AdminOrganizerRowStats
} from '../api/adminRowStats';
import { ADMIN_PAGE_SIZE } from '../api/adminRacesRepository';
import { invalidateAdminCache } from '../lib/adminCache';
import { useAdminFirestoreTable } from '../hooks/useAdminFirestoreTable';
import type { AdminOrganizer } from '../model/types';
import { AdminConsoleModal } from '../ui/AdminConsoleModal';
import { AdminShell } from '../ui/AdminShell';
import styles from '../styles/admin.module.css';

function organizerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function organizerStatusLabel(item: AdminOrganizer): string {
  return item.authUid ? t('admin.organizers.statusActive') : t('admin.organizers.statusInactive');
}

function resolveTableError(code: string): string {
  if (code === 'search_failed') {
    return t('admin.search.error');
  }
  if (code === 'load_failed') {
    return t('admin.organizers.listError');
  }
  return '';
}

export function AdminOrganizersPage(): React.JSX.Element {
  const [unavailableError, setUnavailableError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [detailOrganizer, setDetailOrganizer] = useState<AdminOrganizer | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailNotice, setDetailNotice] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [rowStats, setRowStats] = useState<Map<string, AdminOrganizerRowStats>>(
    new Map()
  );

  const loadPage = useCallback(
    (cursor: Parameters<typeof listAdminOrganizersPage>[2]) => {
      const firebaseCtx = getFirebaseContext();
      if (!firebaseCtx) {
        setUnavailableError(t('admin.unavailable'));
        return Promise.reject(new Error('unavailable'));
      }
      setUnavailableError('');
      return listAdminOrganizersPage(firebaseCtx, ADMIN_PAGE_SIZE, cursor);
    },
    []
  );

  const searchAll = useCallback((query: string) => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      setUnavailableError(t('admin.unavailable'));
      return Promise.reject(new Error('unavailable'));
    }
    setUnavailableError('');
    return searchAdminOrganizers(firebaseCtx, query);
  }, []);

  const {
    rows: visibleOrganizers,
    searchQuery,
    setSearchQuery,
    isLoading,
    isLoadingMore,
    isSearching,
    listError,
    hasMore,
    loadMore,
    reloadList
  } = useAdminFirestoreTable({
    pageSize: ADMIN_PAGE_SIZE,
    loadPage,
    searchAll
  });

  const tableError = resolveTableError(listError);
  const showTableLoading = isLoading || isSearching;

  const refreshAfterMutation = async (): Promise<void> => {
    invalidateAdminCache('organizers:search:');
    invalidateAdminCache('deliveryStats:');
    await reloadList();
  };

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || visibleOrganizers.length === 0) {
      setRowStats(new Map());
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const codes = await listAdminEventCodes(firebaseCtx);
        if (cancelled) {
          return;
        }
        const map = await fetchAdminOrganizerRowStatsMap(
          firebaseCtx,
          visibleOrganizers,
          codes
        );
        if (!cancelled) {
          setRowStats(map);
        }
      } catch {
        if (!cancelled) {
          setRowStats(new Map());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visibleOrganizers]);

  const resetCreateForm = (): void => {
    setName('');
    setEmail('');
    setPassword('');
    setNotes('');
    setFormError('');
  };

  const handleCreate = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    if (!name.trim() || !email.trim().includes('@') || password.length < 6) {
      setFormError(t('admin.organizers.validationCreate'));
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await createAdminOrganizerWithAuth(firebaseCtx, {
        name,
        email,
        password,
        notes
      });
      resetCreateForm();
      setIsCreateOpen(false);
      await refreshAfterMutation();
    } catch (err) {
      if (isEmailInUseWrongPasswordError(err)) {
        setFormError(t('admin.organizers.emailInUseWrongPassword'));
      } else if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
        setFormError(t('admin.organizers.emailInUse'));
      } else {
        setFormError(t('admin.organizers.saveError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openOrganizerDetail = (item: AdminOrganizer): void => {
    setDetailError('');
    setDetailNotice('');
    setEditName(item.name);
    setEditEmail(item.email ?? '');
    setEditNotes(item.notes);
    setDetailOrganizer(item);

    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    setIsDetailLoading(true);
    void fetchAdminOrganizer(firebaseCtx, item.id, { force: true })
      .then((fresh) => {
        if (!fresh) {
          setDetailError(t('admin.organizers.notFound'));
          return;
        }
        setDetailOrganizer(fresh);
        setEditName(fresh.name);
        setEditEmail(fresh.email ?? '');
        setEditNotes(fresh.notes);
      })
      .catch(() => {
        setDetailError(t('admin.organizers.loadError'));
      })
      .finally(() => {
        setIsDetailLoading(false);
      });
  };

  const closeOrganizerDetail = (): void => {
    if (isDetailSaving || isResettingPassword) {
      return;
    }
    setDetailOrganizer(null);
    setDetailError('');
    setDetailNotice('');
    setIsDetailLoading(false);
  };

  const handleDetailDelete = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !detailOrganizer) {
      return;
    }

    if (!window.confirm(t('admin.organizers.deleteConfirm'))) {
      return;
    }

    setIsDetailSaving(true);
    setDetailError('');
    setDetailNotice('');
    try {
      await deleteAdminOrganizer(firebaseCtx, detailOrganizer.id);
      setDetailOrganizer(null);
      await refreshAfterMutation();
    } catch {
      setDetailError(t('admin.organizers.deleteError'));
    } finally {
      setIsDetailSaving(false);
    }
  };

  const handleDetailSave = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !detailOrganizer) {
      return;
    }

    if (!editName.trim()) {
      setDetailError(t('admin.organizers.validation'));
      return;
    }

    setIsDetailSaving(true);
    setDetailError('');
    setDetailNotice('');
    try {
      await upsertAdminOrganizer(firebaseCtx, {
        id: detailOrganizer.id,
        name: editName,
        email: editEmail,
        userId: detailOrganizer.userId ?? '',
        notes: editNotes
      });
      await refreshAfterMutation();
      setDetailOrganizer({
        ...detailOrganizer,
        name: editName.trim(),
        email: editEmail.trim() || null,
        notes: editNotes
      });
    } catch {
      setDetailError(t('admin.organizers.saveError'));
    } finally {
      setIsDetailSaving(false);
    }
  };

  const handleDetailResetPassword = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    const resetEmail = (editEmail.trim() || detailOrganizer?.email || '').toLowerCase();
    if (!firebaseCtx || !detailOrganizer) {
      return;
    }

    if (!resetEmail.includes('@')) {
      setDetailNotice('');
      setDetailError(t('admin.organizers.resetPasswordNoEmail'));
      return;
    }

    if (!window.confirm(t('admin.organizers.resetPasswordConfirm'))) {
      return;
    }

    setIsResettingPassword(true);
    setDetailError('');
    setDetailNotice('');
    try {
      await sendAdminOrganizerPasswordReset(firebaseCtx, resetEmail);
      setDetailNotice(t('admin.organizers.resetPasswordSent'));
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/user-not-found') {
        setDetailError(t('admin.organizers.resetPasswordNoAuth'));
      } else {
        setDetailError(t('admin.organizers.resetPasswordError'));
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isDetailOpen = detailOrganizer != null || isDetailLoading;

  return (
    <AdminShell title={t('admin.organizers.title')} lede={t('admin.organizers.lede')}>
      <div className={consoleStyles.banner}>
        <div>
          <strong>{t('admin.organizers.bannerTitle')}</strong>
          <span>{t('admin.organizers.bannerBody')}</span>
        </div>
        <button
          className={consoleStyles.primary}
          type="button"
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
        >
          {t('admin.organizers.createOpen')}
        </button>
      </div>

      <div className={consoleStyles.panel}>
        <div className={consoleStyles.panelHead}>
          <h3>
            {t('admin.organizers.listTitle')}{' '}
            <span className={consoleStyles.panelCount}>{visibleOrganizers.length}</span>
          </h3>
          <div className={consoleStyles.tableTools}>
            <input
              className={consoleStyles.tableSearch}
              placeholder={t('admin.organizers.liveSearchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t('admin.organizers.liveSearchPlaceholder')}
            />
          </div>
        </div>
        {unavailableError ? (
          <p className={`${styles.error} ${consoleStyles.panelEmpty}`}>{unavailableError}</p>
        ) : null}
        {tableError ? (
          <p className={`${styles.error} ${consoleStyles.panelEmpty}`}>{tableError}</p>
        ) : null}
        {showTableLoading ? (
          <div className={consoleStyles.panelBody}>
            <SkeletonStack count={4} label={t('admin.loading')} />
          </div>
        ) : null}
        {!showTableLoading && visibleOrganizers.length === 0 ? (
          <p className={`${styles.muted} ${consoleStyles.panelEmpty}`}>{t('admin.organizers.empty')}</p>
        ) : null}
        {!showTableLoading && visibleOrganizers.length > 0 ? (
          <div className={consoleStyles.tableWrap}>
            <table className={`${consoleStyles.dataTable} ${consoleStyles.dataTableWide}`}>
              <thead>
                <tr>
                  <th>{t('admin.organizers.table.organizer')}</th>
                  <th>{t('admin.organizers.table.events')}</th>
                  <th>{t('admin.organizers.table.runners')}</th>
                  <th>{t('admin.organizers.table.messages')}</th>
                  <th>{t('admin.organizers.table.portal')}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {visibleOrganizers.map((item) => (
                  <tr
                    key={item.id}
                    className={consoleStyles.clickableRow}
                    onClick={() => openOrganizerDetail(item)}
                  >
                    <td>
                      <div className={consoleStyles.person}>
                        <div className={consoleStyles.avatar}>
                          {organizerInitials(item.name || item.email || '?')}
                        </div>
                        <div>
                          <strong>{item.name || t('admin.organizers.unnamed')}</strong>
                          <div className={consoleStyles.rowMuted}>
                            {item.email ?? t('admin.organizers.noEmail')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{rowStats.get(item.id)?.eventCount ?? 0}</td>
                    <td>{rowStats.get(item.id)?.runnerCount ?? 0}</td>
                    <td>{rowStats.get(item.id)?.messageCount ?? 0}</td>
                    <td>
                      <span
                        className={
                          item.authUid
                            ? `${consoleStyles.status} ${consoleStyles.statusActive}`
                            : `${consoleStyles.status} ${consoleStyles.statusPaused}`
                        }
                      >
                        {organizerStatusLabel(item)}
                      </span>
                    </td>
                    <td>
                      <div className={consoleStyles.actions}>
                        <button
                          className={consoleStyles.smallBtn}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openOrganizerDetail(item);
                          }}
                        >
                          {t('admin.organizers.manage')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!showTableLoading && hasMore ? (
          <div className={consoleStyles.panelFooter}>
            <button
              className={consoleStyles.secondary}
              disabled={isLoadingMore}
              type="button"
              onClick={() => void loadMore()}
            >
              {isLoadingMore ? t('admin.loadingMore') : t('admin.loadMore')}
            </button>
          </div>
        ) : null}
      </div>

      <AdminConsoleModal
        isOpen={isCreateOpen}
        isSaving={isSaving}
        title={t('admin.organizers.createTitle')}
        onClose={() => {
          if (!isSaving) {
            setIsCreateOpen(false);
          }
        }}
        onSave={() => void handleCreate()}
        saveLabel={t('admin.organizers.create')}
      >
        <form
          id="admin-create-organizer"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <div className={consoleStyles.formGrid}>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="organizer-name">
                {t('admin.organizers.field.name')}
              </label>
              <input
                id="organizer-name"
                autoComplete="organization"
                className={consoleStyles.field}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('admin.organizers.placeholder.name')}
              />
            </div>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="organizer-email">
                {t('admin.organizers.field.email')}
              </label>
              <input
                id="organizer-email"
                autoComplete="email"
                className={consoleStyles.field}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('admin.organizers.placeholder.email')}
              />
            </div>
          </div>
          <div className={consoleStyles.fieldGroup}>
            <label className={consoleStyles.fieldLabel} htmlFor="organizer-password">
              {t('admin.organizers.field.password')}
            </label>
            <input
              id="organizer-password"
              autoComplete="new-password"
              className={consoleStyles.field}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('admin.organizers.placeholder.password')}
            />
          </div>
          <div className={consoleStyles.fieldGroup}>
            <label className={consoleStyles.fieldLabel} htmlFor="organizer-notes">
              {t('admin.organizers.field.notes')}
            </label>
            <textarea
              id="organizer-notes"
              className={consoleStyles.textarea}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
          {formError ? <p className={styles.error}>{formError}</p> : null}
        </form>
      </AdminConsoleModal>

      <AdminConsoleModal
        isOpen={isDetailOpen}
        isSaving={isDetailSaving || isResettingPassword}
        title={detailOrganizer?.name || t('admin.organizers.editTitle')}
        onClose={closeOrganizerDetail}
        onSave={() => void handleDetailSave()}
        saveLabel={t('admin.organizers.save')}
      >
        {isDetailLoading && !detailOrganizer ? (
          <p className={styles.muted}>{t('admin.loading')}</p>
        ) : detailOrganizer ? (
          <>
            <div className={consoleStyles.modalHero}>
              <div className={consoleStyles.avatarLg}>
                {organizerInitials(detailOrganizer.name || detailOrganizer.email || '?')}
              </div>
              <div>
                <div className={consoleStyles.modalHeroTitle}>
                  {detailOrganizer.name || t('admin.organizers.unnamed')}
                </div>
                <div className={consoleStyles.rowMuted}>
                  {detailOrganizer.email ?? t('admin.organizers.noEmail')}
                </div>
              </div>
            </div>
            <div className={consoleStyles.detailGrid}>
              <div className={consoleStyles.detail}>
                <small>{t('admin.organizers.table.portal')}</small>
                <span
                  className={
                    detailOrganizer.authUid
                      ? `${consoleStyles.status} ${consoleStyles.statusActive}`
                      : `${consoleStyles.status} ${consoleStyles.statusPaused}`
                  }
                >
                  {organizerStatusLabel(detailOrganizer)}
                </span>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.organizers.field.id')}</small>
                <strong>{detailOrganizer.id}</strong>
              </div>
              {detailOrganizer.authUid ? (
                <div className={consoleStyles.detail}>
                  <small>{t('admin.organizers.field.authUid')}</small>
                  <strong>{detailOrganizer.authUid}</strong>
                </div>
              ) : null}
              <div className={consoleStyles.detail}>
                <small>{t('admin.organizers.portalLoginLabel')}</small>
                <span className={consoleStyles.rowMuted}>/organizer/login</span>
              </div>
            </div>
            <div className={`${consoleStyles.formGrid} ${consoleStyles.modalFormTop}`}>
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel} htmlFor="organizer-edit-name">
                  {t('admin.organizers.field.name')}
                </label>
                <input
                  id="organizer-edit-name"
                  className={consoleStyles.field}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel} htmlFor="organizer-edit-email">
                  {t('admin.organizers.field.email')}
                </label>
                <input
                  id="organizer-edit-email"
                  className={consoleStyles.field}
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                />
              </div>
            </div>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="organizer-edit-notes">
                {t('admin.organizers.field.notes')}
              </label>
              <textarea
                id="organizer-edit-notes"
                className={consoleStyles.textarea}
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                rows={3}
              />
            </div>
            {detailNotice ? <p className={styles.muted}>{detailNotice}</p> : null}
            {detailError ? <p className={styles.error}>{detailError}</p> : null}
            <div className={consoleStyles.modalDetailActions}>
              <button
                className={styles.ghostButtonCompact}
                disabled={isDetailSaving || isResettingPassword}
                type="button"
                onClick={() => void handleDetailResetPassword()}
              >
                {isResettingPassword
                  ? t('admin.loading')
                  : t('admin.organizers.resetPassword')}
              </button>
              <button
                className={styles.dangerButtonCompact}
                disabled={isDetailSaving || isResettingPassword}
                type="button"
                onClick={() => void handleDetailDelete()}
              >
                {isDetailSaving ? t('admin.loading') : t('admin.organizers.delete')}
              </button>
            </div>
          </>
        ) : null}
      </AdminConsoleModal>
    </AdminShell>
  );
}
