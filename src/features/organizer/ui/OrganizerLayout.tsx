import { Link, useLocation } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import type { OrganizerSession } from '../hooks/useOrganizerSession';

interface OrganizerLayoutProps {
  children: React.ReactNode;
  session: OrganizerSession;
  heroTitle?: string;
  heroSubtitle?: string;
}

export function OrganizerLayout({
  children,
  session,
  heroTitle,
  heroSubtitle
}: OrganizerLayoutProps): React.JSX.Element {
  const location = useLocation();
  const onDashboard = location.pathname === '/organizer' || location.pathname === '/organizer/';
  const onEventDetail = location.pathname.startsWith('/organizer/events/');

  const title =
    heroTitle ??
    session.profile?.name ??
    t('organizer.dashboard.title');

  return (
    <div className={consoleStyles.container}>
      <header className={consoleStyles.top}>
        <div>
          <p className={consoleStyles.brand}>{t('organizer.console.brand')}</p>
          <h1 className={consoleStyles.heroTitle}>{title}</h1>
          {heroSubtitle ? <p className={consoleStyles.subtitle}>{heroSubtitle}</p> : null}
        </div>
        <div className={consoleStyles.account}>
          <div className={consoleStyles.pill}>{session.user?.email ?? session.profile?.email ?? ''}</div>
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
        <Link
          className={
            onDashboard
              ? `${consoleStyles.tab} ${consoleStyles.tabActive}`
              : consoleStyles.tab
          }
          to="/organizer"
        >
          {t('organizer.console.tab.events')}
        </Link>
        {onEventDetail ? (
          <span className={`${consoleStyles.tab} ${consoleStyles.tabActive}`}>
            {t('organizer.console.tab.eventDetail')}
          </span>
        ) : null}
      </nav>

      <main>{children}</main>

      <footer className={consoleStyles.footer}>{t('organizer.console.footer')}</footer>
    </div>
  );
}
