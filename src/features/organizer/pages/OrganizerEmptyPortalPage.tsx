import { FirebaseError } from 'firebase/app';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { ConsoleModal } from '@/shared/ui/console-modal';
import adminStyles from '@/features/admin/styles/admin.module.css';
import { createOrganizerEvent } from '../api/organizerEventsRepository';
import { ORGANIZER_EVENT_DISTANCE_DEFAULT } from '../lib/eventDistance';
import type { OrganizerSession } from '../hooks/useOrganizerSession';
import { OrganizerCreateEventFields } from '../ui/OrganizerCreateEventFields';

interface OrganizerEmptyPortalPageProps {
  session: OrganizerSession;
  onEventsCreated: () => void;
}

function mapCreateEventError(error: unknown): string {
  if (error instanceof FirebaseError && error.code === 'permission-denied') {
    return t('organizer.events.saveErrorPermission');
  }
  return t('organizer.events.saveError');
}

export function OrganizerEmptyPortalPage({
  session,
  onEventsCreated
}: OrganizerEmptyPortalPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [distanceMiles, setDistanceMiles] = useState(ORGANIZER_EVENT_DISTANCE_DEFAULT);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const email = session.user?.email ?? session.profile?.email ?? '';

  const handleCreate = async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    const profile = session.profile;
    const authUid = session.user?.uid;
    if (!firebaseCtx || !profile || !authUid) {
      return;
    }
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      setFormError(t('organizer.events.validation'));
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const created = await createOrganizerEvent(firebaseCtx, {
        organizerId: profile.organizerId,
        authUid,
        organizerName: profile.name,
        organizerEmail: profile.email,
        name,
        eventDate: eventDate.trim(),
        distanceMiles
      });
      onEventsCreated();
      void navigate(`/organizer/events/${created.id}/dashboard`);
    } catch (err) {
      setFormError(mapCreateEventError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={consoleStyles.container}>
      <header className={consoleStyles.top}>
        <div>
          <p className={consoleStyles.brand}>{t('organizer.console.brand')}</p>
          <h1 className={consoleStyles.heroTitle}>{t('organizer.dashboard.title')}</h1>
          <p className={consoleStyles.subtitle}>{t('organizer.dashboard.lede')}</p>
        </div>
        <div className={consoleStyles.account}>
          <div className={consoleStyles.pill}>{email}</div>
          <button
            className={consoleStyles.signOut}
            type="button"
            onClick={() => void session.signOutOrganizer()}
          >
            {t('organizer.signOut')}
          </button>
        </div>
      </header>
      <p className={`${adminStyles.muted} ${consoleStyles.emptyPlaceholder}`}>
        {t('organizer.events.empty')}
      </p>
      <button className={consoleStyles.primary} type="button" onClick={() => setIsCreateOpen(true)}>
        {t('organizer.events.createOpen')}
      </button>

      <ConsoleModal
        isOpen={isCreateOpen}
        isSaving={isSaving}
        saveLabel={t('organizer.events.create')}
        title={t('organizer.events.createTitle')}
        onClose={() => {
          if (!isSaving) {
            setIsCreateOpen(false);
          }
        }}
        onSave={() => void handleCreate()}
      >
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <OrganizerCreateEventFields
            dateInputId="organizer-empty-date"
            distanceMiles={distanceMiles}
            eventDate={eventDate}
            formError={formError}
            name={name}
            nameInputId="organizer-empty-name"
            onDistanceChange={setDistanceMiles}
            onEventDateChange={setEventDate}
            onNameChange={setName}
          />
        </form>
      </ConsoleModal>

      <footer className={consoleStyles.footer}>{t('organizer.console.footer')}</footer>
    </div>
  );
}
