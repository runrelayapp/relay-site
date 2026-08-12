import { useState } from 'react';
import { t } from '@/shared/lib/i18n';
import styles from '../styles/landing.module.css';

const NOTIFY_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScLbOh7NAYnLa9Y3Rx_nWTlv2zaz7mThqGFUD_GI1oTU_yv3Q/formResponse';
const NOTIFY_ENTRY_ID = 'entry.779868752';

export function LandingPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasInvalid, setHasInvalid] = useState(false);

  const handleNotify = (): void => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setHasInvalid(true);
      return;
    }

    const tempForm = document.createElement('form');
    tempForm.action = NOTIFY_FORM_URL;
    tempForm.method = 'POST';
    tempForm.target = 'hidden_iframe';
    tempForm.style.display = 'none';
    const hiddenInput = document.createElement('input');
    hiddenInput.name = NOTIFY_ENTRY_ID;
    hiddenInput.value = trimmed;
    tempForm.appendChild(hiddenInput);
    document.body.appendChild(tempForm);
    tempForm.submit();
    document.body.removeChild(tempForm);

    setIsSubmitted(true);
    setHasInvalid(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.badge}>
        <span className={styles.badgeDot} />
        {t('landing.badge')}
      </div>

      <h1 className={styles.headline}>
        {t('landing.headline.lead')}
        <br />
        <em>{t('landing.headline.em')}</em>
      </h1>

      <div className={styles.spacer} />

      <p className={styles.body}>
        {t('landing.body.before')}
        <strong>{t('landing.body.emphasis')}</strong>
      </p>

      <div className={styles.features}>
        <div className={styles.featurePill}>
          <span className={styles.pillIcon} aria-hidden="true">
            🎙️
          </span>
          {t('landing.feature.voice')}
        </div>
        <div className={styles.featurePill}>
          <span className={styles.pillIcon} aria-hidden="true">
            🎵
          </span>
          {t('landing.feature.song')}
        </div>
        <div className={styles.featurePill}>
          <span className={styles.pillIcon} aria-hidden="true">
            💌
          </span>
          {t('landing.feature.text')}
        </div>
        <div className={styles.featurePill}>
          <span className={styles.pillIcon} aria-hidden="true">
            📍
          </span>
          {t('landing.feature.mile')}
        </div>
        <div className={styles.featurePill}>
          <span className={styles.pillIcon} aria-hidden="true">
            🏅
          </span>
          {t('landing.feature.memories')}
        </div>
      </div>

      <div className={styles.quoteCard}>
        <div className={styles.quoteFrom}>{t('landing.quote.from')}</div>
        <div className={styles.quoteText}>{t('landing.quote.text')}</div>
        <div className={styles.quoteMeta}>{t('landing.quote.meta')}</div>
      </div>

      <div className={styles.notifySection}>
        <div className={styles.notifyLabel}>{t('landing.notify.label')}</div>
        {!isSubmitted ? (
          <div className={styles.notifyForm}>
            <input
              className={styles.notifyInput}
              type="email"
              placeholder={t('landing.notify.placeholder')}
              value={email}
              style={hasInvalid ? { borderColor: '#E8724A' } : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setHasInvalid(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNotify();
                }
              }}
            />
            <button type="button" className={styles.notifyBtn} onClick={handleNotify}>
              {t('landing.notify.cta')}
            </button>
          </div>
        ) : (
          <div className={styles.notifySuccess}>{t('landing.notify.success')}</div>
        )}
      </div>

      <a
        className={styles.instagramLink}
        href="https://www.instagram.com/run.relay/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
        {t('landing.instagram')}
      </a>

      <div className={styles.divider} />
      <footer className={styles.footer}>{t('landing.footer')}</footer>

      <iframe name="hidden_iframe" title="notify" style={{ display: 'none' }} />
    </div>
  );
}
