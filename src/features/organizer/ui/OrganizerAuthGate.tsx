import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import adminStyles from '@/features/admin/styles/admin.module.css';
import { useOrganizerSession } from '../hooks/useOrganizerSession';

export function OrganizerAuthGate(): React.JSX.Element {
  const session = useOrganizerSession();
  const location = useLocation();

  if (session.status === 'loading') {
    return (
      <div className={adminStyles.shell}>
        <p className={adminStyles.muted}>{t('organizer.loading')}</p>
      </div>
    );
  }

  if (session.status === 'unavailable') {
    return (
      <div className={adminStyles.shell}>
        <p className={adminStyles.muted}>{t('organizer.unavailable')}</p>
      </div>
    );
  }

  if (session.status === 'signedOut' || session.status === 'forbidden') {
    return (
      <Navigate
        to="/organizer/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet context={session} />;
}
