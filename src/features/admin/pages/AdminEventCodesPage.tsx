import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { SkeletonStack } from '@/shared/ui/skeleton';
import {
  createAdminEventCode,
  deleteAdminEventCode,
  fetchAdminEventCode,
  listAdminEventCodesPage,
  normalizeEventCode,
  purgeOrganizerEventsWithoutRegistry,
  searchAdminEventCodes,
  upsertAdminEventCode
} from '../api/adminEventCodesRepository';
import {
  fetchAdminEventCodeRowStatsMap,
  type AdminEventCodeRowStats
} from '../api/adminRowStats';
import { formatIsoDateForDisplay } from '@/shared/lib/formatIsoDate';
import { ADMIN_PAGE_SIZE } from '../api/adminRacesRepository';
import { invalidateAdminCache } from '../lib/adminCache';
import { useAdminFirestoreTable } from '../hooks/useAdminFirestoreTable';
import type { AdminEventCode } from '../model/types';
import { AdminConsoleModal } from '../ui/AdminConsoleModal';
import { AdminEventCodeMessagesPanel } from '../ui/AdminEventCodeMessagesPanel';
import { AdminShell } from '../ui/AdminShell';
import styles from '../styles/admin.module.css';

function mapEventCodeSaveError(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case 'organizer_not_found':
        return t('admin.eventCodes.organizerNotFound');
      case 'organizer_missing_auth':
        return t('admin.eventCodes.organizerMissingAuth');
      case 'event_code_exists':
        return t('admin.eventCodes.codeExists');
      case 'invalid_event_details':
        return t('admin.eventCodes.validationDetails');
      default:
        break;
    }
  }
  return t('admin.eventCodes.saveError');
}

function resolveTableError(code: string): string {
  if (code === 'search_failed') {
    return t('admin.search.error');
  }
  if (code === 'load_failed') {
    return t('admin.eventCodes.listError');
  }
  return '';
}

export function AdminEventCodesPage(): React.JSX.Element {
  const [unavailableError, setUnavailableError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [organizerId, setOrganizerId] = useState('');
  const [createEventName, setCreateEventName] = useState('');
  const [createEventDate, setCreateEventDate] = useState('');
  const [createDistanceMiles, setCreateDistanceMiles] = useState(26.2);
  const [createMessageLimit, setCreateMessageLimit] = useState(10);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const [detailCode, setDetailCode] = useState<AdminEventCode | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [editEventName, setEditEventName] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editDistanceMiles, setEditDistanceMiles] = useState(26.2);
  const [editMessageLimit, setEditMessageLimit] = useState(10);
  const [editOrganizerEmail, setEditOrganizerEmail] = useState('');
  const [editOrganizerId, setEditOrganizerId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [rowStats, setRowStats] = useState<Map<string, AdminEventCodeRowStats>>(new Map());

  const loadPage = useCallback(
    (cursor: Parameters<typeof listAdminEventCodesPage>[2]) => {
      const firebaseCtx = getFirebaseContext();
      if (!firebaseCtx) {
        setUnavailableError(t('admin.unavailable'));
        return Promise.reject(new Error('unavailable'));
      }
      setUnavailableError('');
      return listAdminEventCodesPage(firebaseCtx, ADMIN_PAGE_SIZE, cursor);
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
    return searchAdminEventCodes(firebaseCtx, query);
  }, []);

  const {
    rows: visibleCodes,
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

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    void purgeOrganizerEventsWithoutRegistry(firebaseCtx).catch(() => undefined);
  }, []);

  const refreshAfterMutation = async (): Promise<void> => {
    invalidateAdminCache('eventCodes:search:');
    invalidateAdminCache('deliveryStats:');
    await reloadList();
  };

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || visibleCodes.length === 0) {
      setRowStats(new Map());
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const map = await fetchAdminEventCodeRowStatsMap(firebaseCtx, visibleCodes);
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
  }, [visibleCodes]);

  const resetCreateForm = (): void => {
    setCode('');
    setOrganizerId('');
    setCreateEventName('');
    setCreateEventDate('');
    setCreateDistanceMiles(26.2);
    setCreateMessageLimit(10);
    setNotes('');
    setFormError('');
  };

  const handleCreate = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    const normalized = normalizeEventCode(code);
    const linkedOrganizerId = organizerId.trim();
    if (
      !normalized ||
      !linkedOrganizerId ||
      !createEventName.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(createEventDate.trim())
    ) {
      setFormError(t('admin.eventCodes.validationDetails'));
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      await createAdminEventCode(firebaseCtx, {
        code: normalized,
        organizerId: linkedOrganizerId,
        eventName: createEventName.trim(),
        organizerEmail: '',
        eventDate: createEventDate.trim(),
        distanceMiles: createDistanceMiles,
        messageLimit: createMessageLimit,
        notes
      });
      resetCreateForm();
      setIsCreateOpen(false);
      await refreshAfterMutation();
    } catch (err) {
      setFormError(mapEventCodeSaveError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const applyDetailFields = (item: AdminEventCode): void => {
    setEditEventName(item.eventName);
    setEditEventDate(item.eventDate ?? '');
    setEditDistanceMiles(item.distanceMiles ?? 26.2);
    setEditMessageLimit(item.messageLimit);
    setEditOrganizerEmail(item.organizerEmail ?? '');
    setEditOrganizerId(item.organizerId ?? '');
    setEditNotes(item.notes);
  };

  const openEventDetail = (item: AdminEventCode): void => {
    setDetailError('');
    setDetailCode(item);
    applyDetailFields(item);

    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    setIsDetailLoading(true);
    void fetchAdminEventCode(firebaseCtx, item.code, { force: true })
      .then((fresh) => {
        if (!fresh) {
          setDetailError(t('admin.eventCodes.notFound'));
          return;
        }
        setDetailCode(fresh);
        applyDetailFields(fresh);
      })
      .catch(() => {
        setDetailError(t('admin.eventCodes.loadError'));
      })
      .finally(() => {
        setIsDetailLoading(false);
      });
  };

  const closeEventDetail = (): void => {
    if (isDetailSaving) {
      return;
    }
    setDetailCode(null);
    setDetailError('');
    setIsDetailLoading(false);
  };

  const handleDetailSave = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !detailCode) {
      return;
    }

    if (!editOrganizerId.trim() || !editEventName.trim()) {
      setDetailError(t('admin.eventCodes.validationDetails'));
      return;
    }

    setIsDetailSaving(true);
    setDetailError('');
    try {
      const saved = await upsertAdminEventCode(firebaseCtx, {
        code: detailCode.code,
        eventName: editEventName.trim(),
        organizerEmail: editOrganizerEmail,
        organizerId: editOrganizerId,
        eventDate: editEventDate.trim(),
        distanceMiles: editDistanceMiles,
        messageLimit: editMessageLimit,
        notes: editNotes
      });
      await refreshAfterMutation();
      setDetailCode(saved);
      applyDetailFields(saved);
    } catch (err) {
      setDetailError(mapEventCodeSaveError(err));
    } finally {
      setIsDetailSaving(false);
    }
  };

  const handleDetailDelete = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !detailCode) {
      return;
    }

    if (!window.confirm(t('admin.eventCodes.deleteConfirm'))) {
      return;
    }

    setIsDetailSaving(true);
    setDetailError('');
    try {
      await deleteAdminEventCode(firebaseCtx, detailCode.code);
      await purgeOrganizerEventsWithoutRegistry(firebaseCtx);
      setDetailCode(null);
      await refreshAfterMutation();
    } catch {
      setDetailError(t('admin.eventCodes.deleteError'));
    } finally {
      setIsDetailSaving(false);
    }
  };

  const isDetailOpen = detailCode != null || isDetailLoading;

  return (
    <AdminShell title={t('admin.eventCodes.title')} lede={t('admin.eventCodes.lede')}>
      <div className={consoleStyles.banner}>
        <div>
          <strong>{t('admin.eventCodes.bannerTitle')}</strong>
          <span>{t('admin.eventCodes.bannerBody')}</span>
        </div>
        <button
          className={consoleStyles.primary}
          type="button"
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
        >
          {t('admin.eventCodes.createOpen')}
        </button>
      </div>

      <div className={consoleStyles.panel}>
        <div className={`${consoleStyles.panelHead} ${consoleStyles.panelHeadToolsOnly}`}>
          <div className={consoleStyles.tableTools}>
            <input
              className={consoleStyles.tableSearch}
              placeholder={t('admin.eventCodes.liveSearchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t('admin.eventCodes.liveSearchPlaceholder')}
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
        {!showTableLoading && visibleCodes.length === 0 ? (
          <p className={`${styles.muted} ${consoleStyles.panelEmpty}`}>{t('admin.eventCodes.empty')}</p>
        ) : null}
        {!showTableLoading && visibleCodes.length > 0 ? (
          <div className={consoleStyles.tableWrap}>
            <table className={`${consoleStyles.dataTable} ${consoleStyles.dataTableWide}`}>
              <thead>
                <tr>
                  <th>{t('admin.eventCodes.table.event')}</th>
                  <th>{t('admin.eventCodes.table.organizer')}</th>
                  <th>{t('admin.eventCodes.table.code')}</th>
                  <th>{t('admin.eventCodes.table.date')}</th>
                  <th>{t('admin.eventCodes.table.runners')}</th>
                  <th>{t('admin.eventCodes.table.messageLimit')}</th>
                  <th>{t('admin.eventCodes.table.status')}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {visibleCodes.map((item) => (
                  <tr
                    key={item.code}
                    className={consoleStyles.clickableRow}
                    onClick={() => openEventDetail(item)}
                  >
                    <td>
                      <strong>{item.eventName || item.code}</strong>
                    </td>
                    <td>
                      {item.organizerDirectoryName ||
                        item.organizerId ||
                        t('admin.eventCodes.noOrganizer')}
                    </td>
                    <td>
                      <span className={consoleStyles.eventCode}>{item.code}</span>
                    </td>
                    <td>
                      {rowStats.get(item.code)?.eventDate
                        ? formatIsoDateForDisplay(rowStats.get(item.code)?.eventDate ?? '')
                        : item.eventDate
                          ? formatIsoDateForDisplay(item.eventDate)
                          : '—'}
                    </td>
                    <td>{rowStats.get(item.code)?.runnerCount ?? 0}</td>
                    <td>
                      <span className={consoleStyles.limit}>
                        {rowStats.get(item.code)?.messageLimit ?? item.messageLimit}
                      </span>
                    </td>
                    <td>
                      <span className={`${consoleStyles.status} ${consoleStyles.statusActive}`}>
                        {rowStats.get(item.code)?.isActive
                          ? t('admin.eventCodes.statusActive')
                          : t('admin.eventCodes.statusInactive')}
                      </span>
                    </td>
                    <td>
                      <div className={consoleStyles.actions}>
                        <button
                          className={consoleStyles.smallBtn}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEventDetail(item);
                          }}
                        >
                          {t('admin.eventCodes.table.manage')}
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
        title={t('admin.eventCodes.createTitle')}
        onClose={() => {
          if (!isSaving) {
            setIsCreateOpen(false);
          }
        }}
        onSave={() => void handleCreate()}
        saveLabel={t('admin.eventCodes.create')}
      >
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <div className={consoleStyles.formGrid}>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="event-code">
                {t('admin.eventCodes.field.code')}
              </label>
              <input
                id="event-code"
                className={consoleStyles.field}
                value={code}
                maxLength={12}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('admin.eventCodes.placeholder.code')}
              />
            </div>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="organizer-id">
                {t('admin.eventCodes.field.organizerId')}
              </label>
              <input
                id="organizer-id"
                className={consoleStyles.field}
                value={organizerId}
                onChange={(event) => setOrganizerId(event.target.value)}
                placeholder={t('admin.eventCodes.placeholder.organizerId')}
              />
            </div>
          </div>
          <div className={consoleStyles.formGrid}>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="admin-create-event-name">
                {t('admin.eventCodes.field.eventName')}
              </label>
              <input
                id="admin-create-event-name"
                className={consoleStyles.field}
                value={createEventName}
                onChange={(event) => setCreateEventName(event.target.value)}
                placeholder={t('admin.eventCodes.placeholder.eventName')}
              />
            </div>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="admin-create-event-date">
                {t('admin.eventCodes.field.eventDate')}
              </label>
              <input
                id="admin-create-event-date"
                className={consoleStyles.field}
                type="date"
                value={createEventDate}
                onChange={(event) => setCreateEventDate(event.target.value)}
              />
            </div>
          </div>
          <div className={consoleStyles.formGrid}>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="admin-create-distance">
                {t('admin.eventCodes.field.distanceMiles')}
              </label>
              <input
                id="admin-create-distance"
                className={consoleStyles.field}
                inputMode="decimal"
                type="number"
                min={0.1}
                max={26.2}
                step={0.1}
                value={createDistanceMiles}
                onChange={(event) => setCreateDistanceMiles(Number(event.target.value))}
              />
            </div>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="admin-create-message-limit">
                {t('admin.eventCodes.field.messageLimit')}
              </label>
              <input
                id="admin-create-message-limit"
                className={consoleStyles.field}
                inputMode="numeric"
                type="number"
                min={1}
                max={100}
                step={1}
                value={createMessageLimit}
                onChange={(event) => setCreateMessageLimit(Number(event.target.value))}
              />
            </div>
          </div>
          <div className={consoleStyles.fieldGroup}>
            <label className={consoleStyles.fieldLabel} htmlFor="event-notes">
              {t('admin.eventCodes.field.notes')}
            </label>
            <textarea
              id="event-notes"
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
        isSaving={isDetailSaving}
        title={detailCode?.eventName || detailCode?.code || t('admin.eventCodes.editTitle')}
        onClose={closeEventDetail}
        onSave={() => void handleDetailSave()}
        saveLabel={t('admin.eventCodes.save')}
      >
        {isDetailLoading && !detailCode ? (
          <p className={styles.muted}>{t('admin.loading')}</p>
        ) : detailCode ? (
          <>
            <div className={consoleStyles.detailGrid}>
              <div className={consoleStyles.detail}>
                <small>{t('admin.eventCodes.field.code')}</small>
                <span className={consoleStyles.eventCode}>{detailCode.code}</span>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.eventCodes.table.status')}</small>
                <span className={`${consoleStyles.status} ${consoleStyles.statusActive}`}>
                  {t('admin.eventCodes.statusActive')}
                </span>
              </div>
            </div>
            <div className={`${consoleStyles.formGrid} ${consoleStyles.modalFormTop}`}>
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel} htmlFor="event-edit-event-name">
                  {t('admin.eventCodes.field.eventName')}
                </label>
                <input
                  id="event-edit-event-name"
                  className={consoleStyles.field}
                  value={editEventName}
                  onChange={(event) => setEditEventName(event.target.value)}
                />
              </div>
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel} htmlFor="event-edit-event-date">
                  {t('admin.eventCodes.field.eventDate')}
                </label>
                <input
                  id="event-edit-event-date"
                  className={consoleStyles.field}
                  type="date"
                  value={editEventDate}
                  onChange={(event) => setEditEventDate(event.target.value)}
                />
              </div>
            </div>
            <div className={`${consoleStyles.formGrid} ${consoleStyles.modalFormTop}`}>
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel} htmlFor="event-edit-distance">
                  {t('admin.eventCodes.field.distanceMiles')}
                </label>
                <input
                  id="event-edit-distance"
                  className={consoleStyles.field}
                  inputMode="decimal"
                  type="number"
                  min={0.1}
                  max={26.2}
                  step={0.1}
                  value={editDistanceMiles}
                  onChange={(event) => setEditDistanceMiles(Number(event.target.value))}
                />
              </div>
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel} htmlFor="event-edit-message-limit">
                  {t('admin.eventCodes.field.messageLimit')}
                </label>
                <input
                  id="event-edit-message-limit"
                  className={consoleStyles.field}
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={editMessageLimit}
                  onChange={(event) => setEditMessageLimit(Number(event.target.value))}
                />
              </div>
            </div>
            <div className={`${consoleStyles.formGrid} ${consoleStyles.modalFormTop}`}>
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel} htmlFor="event-edit-organizer-email">
                  {t('admin.eventCodes.field.organizerEmail')}
                </label>
                <input
                  id="event-edit-organizer-email"
                  className={consoleStyles.field}
                  type="email"
                  value={editOrganizerEmail}
                  onChange={(event) => setEditOrganizerEmail(event.target.value)}
                />
              </div>
            </div>
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="event-edit-organizer-id">
                {t('admin.eventCodes.field.organizerId')}
              </label>
              <input
                id="event-edit-organizer-id"
                className={consoleStyles.field}
                value={editOrganizerId}
                onChange={(event) => setEditOrganizerId(event.target.value)}
                placeholder={t('admin.eventCodes.placeholder.organizerId')}
              />
            </div>
            {detailCode.organizerUserId ? (
              <div className={consoleStyles.fieldGroup}>
                <label className={consoleStyles.fieldLabel}>
                  {t('admin.eventCodes.field.organizerUserId')}
                </label>
                <input
                  className={consoleStyles.field}
                  readOnly
                  value={detailCode.organizerUserId}
                  aria-readonly="true"
                />
              </div>
            ) : null}
            <div className={consoleStyles.fieldGroup}>
              <label className={consoleStyles.fieldLabel} htmlFor="event-edit-notes">
                {t('admin.eventCodes.field.notes')}
              </label>
              <textarea
                id="event-edit-notes"
                className={consoleStyles.textarea}
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                rows={3}
              />
            </div>
            {detailError ? <p className={styles.error}>{detailError}</p> : null}
            {detailCode ? (
              <AdminEventCodeMessagesPanel
                eventCode={detailCode.code}
                eventName={editEventName.trim() || detailCode.eventName}
                messageLimit={editMessageLimit}
              />
            ) : null}
            <div className={consoleStyles.modalDetailActions}>
              <Link
                className={consoleStyles.secondary}
                to={`/admin/races?q=${encodeURIComponent(detailCode.code)}`}
                onClick={closeEventDetail}
              >
                {t('admin.eventCodes.viewRaces')}
              </Link>
              <button
                className={styles.dangerButtonCompact}
                disabled={isDetailSaving}
                type="button"
                onClick={() => void handleDetailDelete()}
              >
                {isDetailSaving ? t('admin.loading') : t('admin.eventCodes.delete')}
              </button>
            </div>
          </>
        ) : null}
      </AdminConsoleModal>
    </AdminShell>
  );
}
