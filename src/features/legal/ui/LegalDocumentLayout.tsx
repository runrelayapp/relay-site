import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import { LegalNav, type LegalNavCurrent } from '@/shared/ui/legal-nav';
import relayLogo from '@/shared/assets/brand/relay-logo.png';
import styles from '../styles/legal.module.css';

interface LegalSection {
  title: string;
  paragraphs: readonly string[];
}

interface LegalDocumentLayoutProps {
  documentTitle: string;
  eyebrow: string;
  footerCurrent: LegalNavCurrent;
  sections: readonly LegalSection[];
  title: string;
  updated: string;
}

export function LegalDocumentLayout({
  documentTitle,
  eyebrow,
  footerCurrent,
  sections,
  title,
  updated
}: LegalDocumentLayoutProps): React.JSX.Element {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = documentTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [documentTitle]);

  return (
    <main className={styles.page}>
      <Link className={styles.header} to="/">
        <img
          alt=""
          aria-hidden="true"
          className={styles.logo}
          height={24}
          src={relayLogo}
          width={24}
        />
        <span className={styles.brand}>{t('legal.brand')}</span>
      </Link>

      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.updated}>{updated}</p>

      {sections.map((section) => (
        <section className={styles.section} key={section.title}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p className={styles.paragraph} key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <LegalNav current={footerCurrent} />
    </main>
  );
}
