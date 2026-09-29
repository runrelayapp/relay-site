import { Link } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import type { OrganizerSession } from '../hooks/useOrganizerSession';
import type { OrganizerEvent } from '../model/types';
import type { OrganizerPortalTab } from '../model/portalTabs';
import { OrganizerEventSwitcher } from './OrganizerEventSwitcher';

interface OrganizerPortalLayoutProps {
  session: OrganizerSession;
  currentEvent: OrganizerEvent;
  events: OrganizerEvent[];
  activeTab: OrganizerPortalTab;
  eventBasePath: string;
  onAddEvent: () => void;
  children: React.ReactNode;
}

const TAB_KEYS: OrganizerPortalTab[] = ['dashboard', 'runners', 'messages', 'event'];

function tabLabel(tab: OrganizerPortalTab): string {
  switch (tab) {
    case 'dashboard':
      return t('organizer.portal.tab.dashboard');
    case 'runners':
      return t('organizer.portal.tab.runners');
    case 'messages':
      return t('organizer.portal.tab.messages');
    case 'event':
      return t('organizer.portal.tab.event');
    default:
      return tab;
  }
}

export function OrganizerPortalLayout({
  session,
  currentEvent,
  events,
  activeTab,
  eventBasePath,
  onAddEvent,
  children
}: OrganizerPortalLayoutProps): React.JSX.Element {
  const email = session.user?.email ?? session.profile?.email ?? '';

  return (
    <div className={consoleStyles.container}>
      <header className={consoleStyles.top}>
        <div>
          <p className={consoleStyles.brand}>{t('organizer.console.brand')}</p>
          <h1 className={consoleStyles.heroTitle}>{currentEvent.name}</h1>
          <OrganizerEventSwitcher
            currentEvent={currentEvent}
            events={events}
            onAddEvent={onAddEvent}
          />
          <p className={consoleStyles.eventContext}>{t('organizer.portal.eventContext')}</p>
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

      <nav className={consoleStyles.tabs} aria-label={t('organizer.console.nav')}>
        {TAB_KEYS.map((tab) => (
          <Link
            key={tab}
            className={
              activeTab === tab
                ? `${consoleStyles.tab} ${consoleStyles.tabActive}`
                : consoleStyles.tab
            }
            to={`${eventBasePath}/${tab}`}
          >
            {tabLabel(tab)}
          </Link>
        ))}
      </nav>

      <main>{children}</main>

      <footer className={consoleStyles.footer}>{t('organizer.console.footer')}</footer>
    </div>
  );
}
