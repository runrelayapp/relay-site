import { Link, useLocation } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import type { AdminSession } from '../hooks/useAdminSession';
import styles from '../styles/admin.module.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  session: AdminSession;
}

interface AdminTab {
  to: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

function adminTabs(): AdminTab[] {
  return [
    {
      to: '/admin',
      label: t('admin.console.tab.overview'),
      isActive: (pathname) => pathname === '/admin' || pathname === '/admin/'
    },
    {
      to: '/admin/organizers',
      label: t('admin.console.tab.organizers'),
      isActive: (pathname) => pathname.startsWith('/admin/organizers')
    },
    {
      to: '/admin/event-codes',
      label: t('admin.console.tab.events'),
      isActive: (pathname) => pathname.startsWith('/admin/event-codes')
    },
    {
      to: '/admin/users',
      label: t('admin.console.tab.users'),
      isActive: (pathname) => pathname.startsWith('/admin/users')
    },
    {
      to: '/admin/races',
      label: t('admin.console.tab.races'),
      isActive: (pathname) => pathname.startsWith('/admin/races')
    },
    {
      to: '/admin/reviews',
      label: t('admin.console.tab.reviews'),
      isActive: (pathname) => pathname.startsWith('/admin/reviews')
    }
  ];
}

export function AdminLayout({ children, session }: AdminLayoutProps): React.JSX.Element {
  const location = useLocation();
  const tabs = adminTabs();

  return (
    <div className={styles.adminFrame}>
      <div className={consoleStyles.container}>
        <header className={consoleStyles.top}>
          <div>
            <p className={consoleStyles.brand}>{t('admin.console.brand')}</p>
            <h1 className={consoleStyles.heroTitle}>{t('admin.console.title')}</h1>
            <p className={consoleStyles.subtitle}>{t('admin.console.subtitle')}</p>
          </div>
          <div className={consoleStyles.account}>
            <div className={consoleStyles.pill}>
              {session.user?.email ?? ''} · {t('admin.console.role')}
            </div>
            <button
              className={consoleStyles.signOut}
              type="button"
              onClick={() => void session.signOutAdmin()}
            >
              {t('admin.signOut')}
            </button>
          </div>
        </header>

        <nav className={consoleStyles.tabs} aria-label={t('admin.nav.label')}>
          {tabs.map((tab) => {
            const isActive = tab.isActive(location.pathname);
            return (
              <Link
                key={tab.to}
                className={
                  isActive
                    ? `${consoleStyles.tab} ${consoleStyles.tabActive}`
                    : consoleStyles.tab
                }
                to={tab.to}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <main className={consoleStyles.main}>{children}</main>

        <footer className={consoleStyles.footer}>{t('admin.console.footer')}</footer>
      </div>
    </div>
  );
}
