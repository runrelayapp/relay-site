import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import styles from './legalNav.module.css';

export type LegalNavCurrent = 'privacy' | 'terms' | 'support';

interface LegalNavItem {
  key: LegalNavCurrent | 'home';
  labelKey: Parameters<typeof t>[0];
  to: string;
}

const ITEMS: readonly LegalNavItem[] = [
  { key: 'privacy', labelKey: 'legal.nav.privacy', to: '/privacy' },
  { key: 'terms', labelKey: 'legal.nav.terms', to: '/terms' },
  { key: 'support', labelKey: 'legal.nav.support', to: '/support' },
  { key: 'home', labelKey: 'legal.nav.home', to: '/' }
];

export interface LegalNavProps {
  className?: string;
  /** Rendered as plain text instead of a link so the page cannot link to itself. */
  current?: LegalNavCurrent;
  /** Include the Home link. Defaults to true on legal documents. */
  showHome?: boolean;
  /** Landing pages use coral links; the race form uses the light theme. */
  tone?: 'landing' | 'form';
}

export function LegalNav({
  className,
  current,
  showHome = true,
  tone = 'landing'
}: LegalNavProps): React.JSX.Element {
  const items = showHome ? ITEMS : ITEMS.filter((item) => item.key !== 'home');
  const toneClass = tone === 'form' ? styles.navForm : undefined;
  const navClass = [styles.nav, toneClass, className].filter(Boolean).join(' ');

  return (
    <nav aria-label={t('legal.nav.label')} className={navClass}>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? (
            <span aria-hidden="true" className={styles.sep}>
              ·
            </span>
          ) : null}
          {item.key === current ? (
            <span className={styles.current}>{t(item.labelKey)}</span>
          ) : (
            <Link to={item.to}>{t(item.labelKey)}</Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
