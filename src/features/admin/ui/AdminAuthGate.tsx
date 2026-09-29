import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import { useAdminSession } from '../hooks/useAdminSession';
import styles from '../styles/admin.module.css';
import { AdminLayout } from './AdminLayout';
import { AdminLoginSkeleton } from './AdminSkeletons';

export function AdminAuthGate(): React.JSX.Element {
  const session = useAdminSession();
  const location = useLocation();

  if (session.status === 'loading') {
    return <AdminLoginSkeleton />;
  }

  if (session.status === 'unavailable') {
    return (
      <div className={styles.shell}>
        <p className={styles.muted}>{t('admin.unavailable')}</p>
      </div>
    );
  }

  if (session.status === 'signedOut' || session.status === 'forbidden') {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return (
    <AdminLayout session={session}>
      <Outlet context={session} />
    </AdminLayout>
  );
}
