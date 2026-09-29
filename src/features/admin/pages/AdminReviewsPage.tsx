import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { formatIsoDateForDisplay } from '@/shared/lib/formatIsoDate';
import { t, type MessageKey } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { SkeletonStack } from '@/shared/ui/skeleton';
import {
  fetchAdminReviewById,
  listRecentAdminReviewsPage,
  searchAdminReviews
} from '../api/adminReviewsRepository';
import { ADMIN_PAGE_SIZE } from '../api/adminRacesRepository';
import { useAdminFirestoreTable } from '../hooks/useAdminFirestoreTable';
import type { AdminReview } from '../model/types';
import { AdminConsoleModal } from '../ui/AdminConsoleModal';
import { AdminShell } from '../ui/AdminShell';
import styles from '../styles/admin.module.css';

const COMMENT_PREVIEW_CHARS = 72;

function formatReviewDate(ms: number | null): string {
  if (ms == null) {
    return t('admin.reviews.noDate');
  }
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function previewComment(comment: string): string {
  if (!comment) {
    return t('admin.reviews.field.noComment');
  }
  if (comment.length <= COMMENT_PREVIEW_CHARS) {
    return comment;
  }
  return `${comment.slice(0, COMMENT_PREVIEW_CHARS).trimEnd()}…`;
}

function runnerLabel(review: AdminReview): string {
  return review.runnerUsername || review.runnerFullName || review.userId || '—';
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

export function AdminReviewsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [unavailableError, setUnavailableError] = useState('');

  const loadPage = useCallback(
    (cursor: Parameters<typeof listRecentAdminReviewsPage>[2]) => {
      const firebaseCtx = getFirebaseContext();
      if (!firebaseCtx) {
        setUnavailableError(t('admin.unavailable'));
        return Promise.reject(new Error('unavailable'));
      }
      setUnavailableError('');
      return listRecentAdminReviewsPage(firebaseCtx, ADMIN_PAGE_SIZE, cursor);
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
    return searchAdminReviews(firebaseCtx, query);
  }, []);

  const {
    rows: visibleReviews,
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

  const tableError = resolveTableError(listError, 'admin.reviews.listError');
  const showTableLoading = isLoading || isSearching;

  const openReview = async (reviewId: string): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      return;
    }

    setIsModalLoading(true);
    setSelectedReview(null);
    try {
      const full = await fetchAdminReviewById(firebaseCtx, reviewId, {
        force: true
      });
      if (full) {
        setSelectedReview(full);
      }
    } finally {
      setIsModalLoading(false);
    }
  };

  return (
    <AdminShell title={t('admin.reviews.title')} lede={t('admin.reviews.lede')}>
      <div className={consoleStyles.panel}>
        <div className={consoleStyles.panelHead}>
          <h3>
            {t('admin.reviews.listTitle')}{' '}
            <span className={consoleStyles.panelCount}>{visibleReviews.length}</span>
          </h3>
          <div className={consoleStyles.tableTools}>
            <input
              className={consoleStyles.tableSearch}
              placeholder={t('admin.reviews.liveSearchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t('admin.reviews.liveSearchPlaceholder')}
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
        {!showTableLoading && visibleReviews.length === 0 ? (
          <p className={`${styles.muted} ${consoleStyles.panelEmpty}`}>
            {t('admin.reviews.emptyList')}
          </p>
        ) : null}
        {!showTableLoading && visibleReviews.length > 0 ? (
          <div className={consoleStyles.tableWrap}>
            <table className={consoleStyles.dataTable}>
              <thead>
                <tr>
                  <th>{t('admin.reviews.table.user')}</th>
                  <th>{t('admin.reviews.table.rating')}</th>
                  <th>{t('admin.reviews.table.comment')}</th>
                  <th>{t('admin.reviews.table.date')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleReviews.map((review) => (
                  <tr
                    key={review.id}
                    className={consoleStyles.clickableRow}
                    onClick={() => void openReview(review.id)}
                  >
                    <td>
                      <div className={consoleStyles.person}>
                        <div>
                          <strong>{runnerLabel(review)}</strong>
                          <div className={consoleStyles.rowMuted}>
                            {review.runnerEmail ?? review.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{t('admin.reviews.ratingValue', { rating: review.rating })}</td>
                    <td>
                      <span className={consoleStyles.rowMuted}>
                        {previewComment(review.comment)}
                      </span>
                    </td>
                    <td>{formatReviewDate(review.createdAtMs)}</td>
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
        isOpen={selectedReview != null || isModalLoading}
        title={t('admin.reviews.modalTitle')}
        onClose={() => {
          setSelectedReview(null);
          setIsModalLoading(false);
        }}
      >
        {isModalLoading ? (
          <p className={styles.muted}>{t('admin.loading')}</p>
        ) : selectedReview ? (
          <>
            <div className={consoleStyles.modalHero}>
              <div>
                <div className={consoleStyles.modalHeroTitle}>
                  {t('admin.reviews.ratingValue', { rating: selectedReview.rating })}
                </div>
                <div className={consoleStyles.rowMuted}>
                  {formatReviewDate(selectedReview.createdAtMs)}
                </div>
              </div>
            </div>
            <div className={consoleStyles.detailGrid}>
              <div className={consoleStyles.detail}>
                <small>{t('admin.reviews.field.comment')}</small>
                <strong>
                  {selectedReview.comment || t('admin.reviews.field.noComment')}
                </strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.reviews.field.user')}</small>
                <strong>{runnerLabel(selectedReview)}</strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.reviews.field.userId')}</small>
                <strong>{selectedReview.userId || '—'}</strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.reviews.field.race')}</small>
                <strong>
                  {selectedReview.raceName
                    ? selectedReview.raceDate
                      ? `${selectedReview.raceName} · ${formatIsoDateForDisplay(selectedReview.raceDate)}`
                      : selectedReview.raceName
                    : '—'}
                </strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.reviews.field.raceId')}</small>
                <strong>{selectedReview.raceId || '—'}</strong>
              </div>
              <div className={consoleStyles.detail}>
                <small>{t('admin.reviews.field.date')}</small>
                <strong>{formatReviewDate(selectedReview.createdAtMs)}</strong>
              </div>
            </div>
            <div className={consoleStyles.formActions}>
              {selectedReview.userId ? (
                <button
                  className={consoleStyles.secondary}
                  type="button"
                  onClick={() => {
                    setSelectedReview(null);
                    void navigate(
                      `/admin/users?q=${encodeURIComponent(selectedReview.userId)}`
                    );
                  }}
                >
                  {t('admin.reviews.viewUser')}
                </button>
              ) : null}
              {selectedReview.raceId ? (
                <button
                  className={consoleStyles.secondary}
                  type="button"
                  onClick={() => {
                    setSelectedReview(null);
                    void navigate(`/admin/races/${selectedReview.raceId}`);
                  }}
                >
                  {t('admin.reviews.viewRace')}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </AdminConsoleModal>
    </AdminShell>
  );
}
