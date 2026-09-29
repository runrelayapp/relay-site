import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t, type MessageKey } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { SkeletonStack } from '@/shared/ui/skeleton';
import {
  fetchAdminUserById,
  listRecentAdminUsersPage,
  searchAdminUsers,
  setAdminUserRelayPlus
} from '../api/adminUsersRepository';
import { ADMIN_PAGE_SIZE } from '../api/adminRacesRepository';
import { ADMIN_CACHE_KEYS, invalidateAdminCache, writeAdminCache } from '../lib/adminCache';
import { useAdminFirestoreTable } from '../hooks/useAdminFirestoreTable';
import type { AdminUserSummary } from '../model/types';
import { AdminConsoleModal } from '../ui/AdminConsoleModal';
import { AdminShell } from '../ui/AdminShell';
import styles from '../styles/admin.module.css';

function userInitials(user: AdminUserSummary): string {
  const source = user.fullName || user.username || user.email || '?';
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function resolveTableError(code: string, loadErrorKey: MessageKey): string {
  if (code === 'search_failed') {
    return t('admin.search.error');
  }
  if (code === 'load_failed') {
    return t(loadErrorKey);
  }
  return '';
}

export function AdminUsersPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [unavailableError, setUnavailableError] = useState('');

  const loadPage = useCallback(
    (cursor: Parameters<typeof listRecentAdminUsersPage>[2]) => {
      const firebaseCtx = getFirebaseContext();
      if (!firebaseCtx) {
        setUnavailableError(t('admin.unavailable'));
        return Promise.reject(new Error('unavailable'));
      }
      setUnavailableError('');
      return listRecentAdminUsersPage(firebaseCtx, ADMIN_PAGE_SIZE, cursor);
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
    return searchAdminUsers(firebaseCtx, query);
  }, []);

  const {
    rows: visibleUsers,
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

  useEffect(() => {
    const initialQuery = searchParams.get('q')?.trim() ?? '';
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [searchParams, setSearchQuery]);

  const tableError = resolveTableError(listError, 'admin.users.listError');

  const openUser = async (userId: string): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    setIsModalLoading(true);
    setSelectedUser(null);
    try {
      const full = await fetchAdminUserById(firebaseCtx, userId, { force: true });
      if (full) {
        setSelectedUser(full);
      }
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleToggleRelayPlus = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !selectedUser) {
      return;
    }

    setIsSaving(true);
    try {
      const next = !selectedUser.relayPlus;
      await setAdminUserRelayPlus(firebaseCtx, selectedUser.id, next);
      const updated = { ...selectedUser, relayPlus: next };
      setSelectedUser(updated);
      writeAdminCache(ADMIN_CACHE_KEYS.user(selectedUser.id), updated);
      invalidateAdminCache('users:search:');
      await reloadList();
    } finally {
      setIsSaving(false);
    }
  };

  const showTableLoading = isLoading || isSearching;

  return (
    <AdminShell title={t('admin.users.title')} lede={t('admin.users.lede')}>
      <div className={consoleStyles.panel}>
        <div className={consoleStyles.panelHead}>
          <h3>
            {t('admin.users.listTitle')}{' '}
            <span className={consoleStyles.panelCount}>{visibleUsers.length}</span>
          </h3>
          <div className={consoleStyles.tableTools}>
            <input
              className={consoleStyles.tableSearch}
              placeholder={t('admin.users.liveSearchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t('admin.users.liveSearchPlaceholder')}
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
            <SkeletonStack count={5} label={t('admin.loading')} />
          </div>
        ) : null}
        {!showTableLoading && visibleUsers.length === 0 ? (
          <p className={`${styles.muted} ${consoleStyles.panelEmpty}`}>{t('admin.users.emptyList')}</p>
        ) : null}
        {!showTableLoading && visibleUsers.length > 0 ? (
          <div className={consoleStyles.tableWrap}>
            <table className={consoleStyles.dataTable}>
              <thead>
                <tr>
                  <th>{t('admin.users.table.user')}</th>
                  <th>{t('admin.users.table.relayPlus')}</th>
                  <th>{t('admin.users.table.races')}</th>
                  <th>{t('admin.users.table.relays')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={consoleStyles.clickableRow}
                    onClick={() => void openUser(user.id)}
                  >
                    <td>
                      <div className={consoleStyles.person}>
                        {user.avatarUrl ? (
                          <img
                            alt=""
                            className={consoleStyles.avatarImg}
                            height={35}
                            src={user.avatarUrl}
                            width={35}
                          />
                        ) : (
                          <div aria-hidden="true" className={consoleStyles.avatar}>
                            {userInitials(user)}
                          </div>
                        )}
                        <div>
                          <strong>{user.username || user.fullName || user.id}</strong>
                          <div className={consoleStyles.rowMuted}>{user.email ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          user.relayPlus
                            ? `${consoleStyles.status} ${consoleStyles.statusActive}`
                            : `${consoleStyles.status} ${consoleStyles.statusPaused}`
                        }
                      >
                        {user.relayPlus
                          ? t('admin.users.relayPlusOn')
                          : t('admin.users.relayPlusOff')}
                      </span>
                    </td>
                    <td>{user.raceCountTotal}</td>
                    <td>{user.messageCountTotal}</td>
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
        hideFooter
        isOpen={selectedUser != null || isModalLoading}
        title={t('admin.users.modalTitle')}
        onClose={() => {
          if (!isSaving) {
            setSelectedUser(null);
            setIsModalLoading(false);
          }
        }}
      >
        {isModalLoading ? (
          <p className={styles.muted}>{t('admin.loading')}</p>
        ) : selectedUser ? (
          <>
            <div className={consoleStyles.modalHero}>
              <div className={consoleStyles.avatarLg}>{userInitials(selectedUser)}</div>
              <div>
                <div className={consoleStyles.modalHeroTitle}>
                  {selectedUser.username ? `@${selectedUser.username}` : selectedUser.fullName}
                </div>
                <div className={consoleStyles.rowMuted}>{selectedUser.email ?? '—'}</div>
              </div>
            </div>
            <div className={consoleStyles.detailGrid}>
              <div className={consoleStyles.detail}>
                <small>{t('admin.users.table.relayPlus')}</small>
                <button
                  className={consoleStyles.secondary}
                  disabled={isSaving}
                  type="button"
                  onClick={() => void handleToggleRelayPlus()}
                >
                  {selectedUser.relayPlus
                    ? t('admin.users.relayPlusOn')
                    : t('admin.users.relayPlusOff')}
                </button>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.users.table.races')}</small>
                <strong>{selectedUser.raceCountTotal}</strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.users.table.relays')}</small>
                <strong>{selectedUser.messageCountTotal}</strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.users.mode.userId')}</small>
                <strong>{selectedUser.id}</strong>
              </div>
            </div>
            <div className={consoleStyles.formActions}>
              <button
                className={`${consoleStyles.primary} ${consoleStyles.modalPrimaryWide}`}
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  void navigate(
                    `/admin/races?q=${encodeURIComponent(selectedUser.id)}`
                  );
                }}
              >
                {t('admin.users.viewRacesHint')}
              </button>
            </div>
          </>
        ) : null}
      </AdminConsoleModal>
    </AdminShell>
  );
}
