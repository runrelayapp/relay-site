import { Skeleton } from '@/shared/ui/skeleton';
import { t } from '@/shared/lib/i18n';
import styles from '../styles/admin.module.css';

export function AdminLoginSkeleton(): React.JSX.Element {
  return (
    <div className={styles.shell}>
      <div
        aria-busy="true"
        aria-label={t('admin.loading')}
        className={styles.loginCard}
      >
        <Skeleton height="0.7rem" radius="pill" width="7rem" />
        <div style={{ height: '0.75rem' }} />
        <Skeleton height="2rem" radius="md" width="70%" />
        <div style={{ height: '0.65rem' }} />
        <Skeleton height="1rem" radius="md" width="90%" />
        <div style={{ height: '1.4rem' }} />
        <Skeleton height="0.75rem" radius="md" width="4rem" />
        <div style={{ height: '0.4rem' }} />
        <Skeleton height="2.85rem" radius="lg" />
        <div style={{ height: '0.75rem' }} />
        <Skeleton height="0.75rem" radius="md" width="5rem" />
        <div style={{ height: '0.4rem' }} />
        <Skeleton height="2.85rem" radius="lg" />
        <div style={{ height: '1rem' }} />
        <Skeleton height="2.85rem" radius="lg" />
      </div>
    </div>
  );
}
