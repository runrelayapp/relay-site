import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { SkeletonStack } from '@/shared/ui/skeleton';
import adminStyles from '@/features/admin/styles/admin.module.css';
import { useOrganizerParticipantsTable } from '../hooks/useOrganizerParticipantsTable';
import {
  formatIsoDateForDisplay,
  initialsFromDisplayName,
  mapParticipantStatusKey
} from '../lib/organizerRunnerUtils';
import type { OrganizerEventParticipant } from '../model/types';

interface OrganizerRunnersTableProps {
  eventCode: string;
  previewLimit?: number;
  panelTitle: string;
  countLabel?: string;
  searchPlaceholder: string;
  onRowClick: (row: OrganizerEventParticipant) => void;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return t('organizer.portal.status.finished');
    case 'active':
      return t('organizer.portal.status.running');
    case 'upcoming':
      return t('organizer.portal.status.notStarted');
    default:
      return t('organizer.participants.status.unknown');
  }
}

function statusClassName(status: string): string {
  const key = mapParticipantStatusKey(status);
  switch (key) {
    case 'finished':
      return `${consoleStyles.status} ${consoleStyles.statusFinished}`;
    case 'running':
      return `${consoleStyles.status} ${consoleStyles.statusRunning}`;
    case 'not-started':
      return `${consoleStyles.status} ${consoleStyles.statusNotStarted}`;
    case 'scheduled':
      return `${consoleStyles.status} ${consoleStyles.statusScheduled}`;
    default:
      return `${consoleStyles.status} ${consoleStyles.statusNotStarted}`;
  }
}

function resolveTableError(code: string): string {
  if (code === 'search_failed') {
    return t('admin.search.error');
  }
  if (code === 'load_failed') {
    return t('organizer.participants.loadError');
  }
  if (code === 'unavailable') {
    return t('organizer.unavailable');
  }
  return '';
}

export function OrganizerRunnersTable({
  eventCode,
  previewLimit,
  panelTitle,
  countLabel,
  searchPlaceholder,
  onRowClick
}: OrganizerRunnersTableProps): React.JSX.Element {
  const {
    rows,
    searchQuery,
    setSearchQuery,
    isLoading,
    isLoadingMore,
    isSearching,
    listError,
    hasMore,
    loadMore,
    isSearchActive
  } = useOrganizerParticipantsTable(eventCode);

  const showTableLoading = isLoading || isSearching;
  const tableError = resolveTableError(listError);
  const displayRows =
    previewLimit != null && !isSearchActive ? rows.slice(0, previewLimit) : rows;
  const showLoadMore = previewLimit == null && !showTableLoading && hasMore;

  return (
    <div className={consoleStyles.panel}>
      <div className={consoleStyles.panelHead}>
        <h2 className={consoleStyles.panelHeadTitle}>
          {panelTitle}
          {countLabel ? (
            <span className={consoleStyles.panelCountMuted}> {countLabel}</span>
          ) : null}
        </h2>
        <div className={consoleStyles.tableTools}>
          <input
            className={consoleStyles.tableSearch}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label={searchPlaceholder}
          />
        </div>
      </div>
      {tableError ? (
        <p className={`${adminStyles.error} ${consoleStyles.panelEmpty}`}>{tableError}</p>
      ) : null}
      {showTableLoading ? (
        <div className={consoleStyles.panelBody}>
          <SkeletonStack count={previewLimit ?? 5} label={t('organizer.loading')} />
        </div>
      ) : null}
      {!showTableLoading && displayRows.length === 0 ? (
        <div className={consoleStyles.tableWrap}>
          <table className={consoleStyles.dataTable}>
            <thead>
              <tr>
                <th>{t('organizer.portal.table.runner')}</th>
                <th>{t('organizer.portal.table.raceDate')}</th>
                <th>{t('organizer.portal.table.supporters')}</th>
                <th>{t('organizer.portal.table.messages')}</th>
                <th>{t('organizer.portal.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={consoleStyles.empty} colSpan={5}>
                  {t('organizer.participants.empty')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      {!showTableLoading && displayRows.length > 0 ? (
        <div className={consoleStyles.tableWrap}>
          <table className={consoleStyles.dataTable}>
            <thead>
              <tr>
                <th>{t('organizer.portal.table.runner')}</th>
                <th>{t('organizer.portal.table.raceDate')}</th>
                <th>{t('organizer.portal.table.supporters')}</th>
                <th>{t('organizer.portal.table.messages')}</th>
                <th>{t('organizer.portal.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => (
                <tr
                  key={row.id}
                  className={consoleStyles.clickableRow}
                  onClick={() => onRowClick(row)}
                >
                  <td>
                    <div className={consoleStyles.person}>
                      <div className={consoleStyles.avatar}>
                        {initialsFromDisplayName(row.displayName)}
                      </div>
                      <div>
                        <strong>{row.displayName}</strong>
                        {row.username ? (
                          <div className={consoleStyles.rowMuted}>@{row.username}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>{formatIsoDateForDisplay(row.raceDate)}</td>
                  <td>{row.supporterCount}</td>
                  <td>{row.messageCount}</td>
                  <td>
                    <span className={statusClassName(row.status)}>{statusLabel(row.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {showLoadMore ? (
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
  );
}
