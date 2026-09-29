import { Navigate, useOutletContext } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { SkeletonStack } from '@/shared/ui/skeleton';
import adminStyles from '@/features/admin/styles/admin.module.css';
import { useOrganizerEventsList } from '../hooks/useOrganizerEventsList';
import type { OrganizerSession } from '../hooks/useOrganizerSession';
import { OrganizerEmptyPortalPage } from './OrganizerEmptyPortalPage';

export function OrganizerHomePage(): React.JSX.Element {
  const session = useOutletContext<OrganizerSession>();
  const organizerId = session.profile?.organizerId ?? '';
  const { events, isLoading, error } = useOrganizerEventsList(organizerId);

  if (isLoading && events.length === 0) {
    return (
      <div className={consoleStyles.container}>
        <SkeletonStack count={3} label={t('organizer.loading')} />
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className={consoleStyles.container}>
        <p className={adminStyles.error}>{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return <OrganizerEmptyPortalPage session={session} onEventsCreated={() => {}} />;
  }

  const first = events[0];
  return <Navigate to={`/organizer/events/${first.id}/dashboard`} replace />;
}
