import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { SkeletonStack } from '@/shared/ui/skeleton';
import { searchAdminRacesLive } from '../api/adminRaceSearch';
import { ADMIN_PAGE_SIZE, listRecentAdminRacesPage } from '../api/adminRacesRepository';
import { useAdminFirestoreTable } from '../hooks/useAdminFirestoreTable';
import type { AdminRaceSummary } from '../model/types';
import { AdminShell } from '../ui/AdminShell';
import styles from '../styles/admin.module.css';

function statusLabel(status: AdminRaceSummary['status']): string {
  switch (status) {
    case 'active':
      return t('admin.status.active');
    case 'completed':
      return t('admin.status.completed');
    case 'upcoming':
      return t('admin.status.upcoming');
    default:
      return t('admin.status.unknown');
  }
}

function statusClass(status: AdminRaceSummary['status']): string {
  switch (status) {
    case 'active':
    case 'completed':
      return `${consoleStyles.status} ${consoleStyles.statusActive}`;
    case 'upcoming':
      return `${consoleStyles.status} ${consoleStyles.statusPending}`;
    default:
      return `${consoleStyles.status} ${consoleStyles.statusPaused}`;
  }
}

function resolveTableError(code: string): string {
  if (code === 'search_failed') {
    return t('admin.search.error');
  }
  if (code === 'load_failed') {
    return t('admin.races.listError');
  }
  return '';
}

export function AdminRacesPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [unavailableError, setUnavailableError] = useState('');

  const loadPage = useCallback(
    (cursor: Parameters<typeof listRecentAdminRacesPage>[2]) => {
      const firebaseCtx = getFirebaseContext();
      if (!firebaseCtx) {
        setUnavailableError(t('admin.unavailable'));
        return Promise.reject(new Error('unavailable'));
      }
      setUnavailableError('');
      return listRecentAdminRacesPage(firebaseCtx, ADMIN_PAGE_SIZE, cursor);
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
    return searchAdminRacesLive(firebaseCtx, query);
  }, []);

  const {
    rows: visibleRaces,
    searchQuery,
    setSearchQuery,
    isLoading,
    isLoadingMore,
    isSearching,
    listError,
    hasMore,
    loadMore
  } = useAdminFirestoreTable({
    pageSize: ADMIN_PAGE_SIZE,
    loadPage,
    searchAll
  });

  useEffect(() => {
    const qParam = searchParams.get('q') ?? searchParams.get('userId') ?? '';
    if (qParam.trim()) {
      setSearchQuery(qParam.trim());
    }
  }, [searchParams, setSearchQuery]);

  const tableError = resolveTableError(listError);
  const showTableLoading = isLoading || isSearching;

  return (
    <AdminShell title={t('admin.races.title')} lede={t('admin.races.search.lede')}>
      <div className={consoleStyles.panel}>
        <div className={consoleStyles.panelHead}>
          <h3>{t('admin.races.panelTitle')}</h3>
          <div className={consoleStyles.tableTools}>
            <input
              className={consoleStyles.tableSearch}
              placeholder={t('admin.races.liveSearchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t('admin.races.liveSearchPlaceholder')}
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
        {!showTableLoading && visibleRaces.length === 0 ? (
          <p className={`${styles.muted} ${consoleStyles.panelEmpty}`}>{t('admin.races.empty')}</p>
        ) : null}
        {!showTableLoading && visibleRaces.length > 0 ? (
          <div className={consoleStyles.tableWrap}>
            <table className={`${consoleStyles.dataTable} ${consoleStyles.dataTableWide}`}>
              <thead>
                <tr>
                  <th>{t('admin.races.table.race')}</th>
                  <th>{t('admin.races.table.raceId')}</th>
                  <th>{t('admin.races.table.eventCode')}</th>
                  <th>{t('admin.races.table.date')}</th>
                  <th>{t('admin.races.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRaces.map((race) => (
                  <tr
                    key={race.id}
                    className={consoleStyles.clickableRow}
                    onClick={() => void navigate(`/admin/races/${race.id}`)}
                  >
                    <td>
                      <strong>{race.raceName}</strong>
                      <div className={consoleStyles.rowMuted}>
                        {race.runnerUsername ?? race.runnerEmail ?? race.userId}
                      </div>
                    </td>
                    <td>
                      <span className={consoleStyles.rowMuted}>{race.id}</span>
                    </td>
                    <td>
                      {race.eventCode ? (
                        <span className={consoleStyles.eventCode}>{race.eventCode}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{race.raceDate || t('admin.races.noDate')}</td>
                    <td>
                      <span className={statusClass(race.status)}>{statusLabel(race.status)}</span>
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
    </AdminShell>
  );
}
