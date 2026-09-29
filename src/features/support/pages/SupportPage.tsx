import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import { LegalNav } from '@/shared/ui/legal-nav';
import relayLogo from '@/shared/assets/brand/relay-logo.png';
import { submitSupportForm } from '../lib/submitSupportForm';
import {
  SUPPORT_PLATFORMS,
  SUPPORT_TOPICS,
  type SupportFormValues,
  type SupportPlatform,
  type SupportTopic
} from '../model/types';
import styles from '../styles/support.module.css';

type FieldKey = keyof SupportFormValues;

const FAQ_ITEMS = [
  {
    questionKey: 'support.faq.supporters.q',
    answerKey: 'support.faq.supporters.a'
  },
  {
    questionKey: 'support.faq.timing.q',
    answerKey: 'support.faq.timing.a'
  },
  {
    questionKey: 'support.faq.noGps.q',
    answerKey: 'support.faq.noGps.a'
  },
  {
    questionKey: 'support.faq.missed.q',
    answerKey: 'support.faq.missed.a'
  },
  {
    questionKey: 'support.faq.memory.q',
    answerKey: 'support.faq.memory.a'
  }
] as const;

function topicLabel(topic: SupportTopic): string {
  switch (topic) {
    case 'Messages not playing':
      return t('support.topic.messages');
    case 'Supporter link':
      return t('support.topic.link');
    case 'Account':
      return t('support.topic.account');
    case 'Race Memory':
      return t('support.topic.memory');
    case 'Distance tracking':
      return t('support.topic.distance');
    case 'Notifications':
      return t('support.topic.notifications');
    case 'Song links':
      return t('support.topic.songs');
    default:
      return t('support.topic.other');
  }
}

function platformLabel(platform: SupportPlatform): string {
  switch (platform) {
    case 'iPhone':
      return t('support.platform.iphone');
    case 'Android':
      return t('support.platform.android');
    default:
      return t('support.platform.other');
  }
}

export function SupportPage(): React.JSX.Element {
  const nameId = useId();
  const emailId = useId();
  const platformId = useId();
  const topicId = useId();
  const messageId = useId();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidField, setInvalidField] = useState<FieldKey | null>(null);
  const [values, setValues] = useState<SupportFormValues>({
    name: '',
    email: '',
    platform: '',
    topic: '',
    message: ''
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t('support.documentTitle');
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const setField = <K extends FieldKey>(key: K, value: SupportFormValues[K]): void => {
    setValues((current) => ({ ...current, [key]: value }));
    if (invalidField === key) {
      setInvalidField(null);
    }
  };

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (!values.name.trim()) {
      setInvalidField('name');
      return;
    }
    if (!values.email.trim() || !values.email.includes('@')) {
      setInvalidField('email');
      return;
    }
    if (!values.platform) {
      setInvalidField('platform');
      return;
    }
    if (!values.topic) {
      setInvalidField('topic');
      return;
    }
    if (!values.message.trim()) {
      setInvalidField('message');
      return;
    }

    setIsSubmitting(true);
    submitSupportForm(values);
    window.setTimeout(() => {
      setIsSubmitted(true);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <main className={styles.page}>
      <Link className={styles.header} to="/">
        <img
          alt=""
          aria-hidden="true"
          className={styles.logo}
          height={26}
          src={relayLogo}
          width={26}
        />
        <span className={styles.brand}>{t('support.brand')}</span>
      </Link>

      <header className={styles.hero}>
        <h1 className={styles.title}>
          {t('support.title.lead')}
          <br />
          {t('support.title.beforeEm')}
          <em className={styles.titleEm}>{t('support.title.em')}</em>
        </h1>
        <p className={styles.lede}>{t('support.lede')}</p>
      </header>

      <section aria-label={t('support.faq.title')} className={styles.faqSection}>
        <h2 className={styles.faqTitle}>{t('support.faq.title')}</h2>
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openFaqIndex === index;
          return (
            <div
              className={isOpen ? `${styles.faqItem} ${styles.faqItemOpen}` : styles.faqItem}
              key={item.questionKey}
            >
              <button
                aria-expanded={isOpen}
                className={styles.faqQuestion}
                type="button"
                onClick={() => setOpenFaqIndex(isOpen ? null : index)}
              >
                {t(item.questionKey)}
                <svg
                  aria-hidden="true"
                  className={styles.faqChevron}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  viewBox="0 0 16 16"
                >
                  <path d="M3 6l5 5 5-5" />
                </svg>
              </button>
              <div className={styles.faqAnswer}>{t(item.answerKey)}</div>
            </div>
          );
        })}
      </section>

      {!isSubmitted ? (
        <section className={styles.formCard}>
          <h2 className={styles.formTitle}>{t('support.form.title')}</h2>
          <p className={styles.formLede}>{t('support.form.lede')}</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={nameId}>
                {t('support.field.name')}
              </label>
              <input
                autoComplete="name"
                className={
                  invalidField === 'name'
                    ? `${styles.input} ${styles.inputInvalid}`
                    : styles.input
                }
                id={nameId}
                placeholder={t('support.placeholder.name')}
                type="text"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={emailId}>
                {t('support.field.email')}
              </label>
              <input
                autoComplete="email"
                className={
                  invalidField === 'email'
                    ? `${styles.input} ${styles.inputInvalid}`
                    : styles.input
                }
                id={emailId}
                placeholder={t('support.placeholder.email')}
                type="email"
                value={values.email}
                onChange={(event) => setField('email', event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={platformId}>
                {t('support.field.platform')}
              </label>
              <select
                className={
                  invalidField === 'platform'
                    ? `${styles.select} ${styles.selectInvalid}`
                    : styles.select
                }
                id={platformId}
                value={values.platform}
                onChange={(event) =>
                  setField('platform', event.target.value as SupportPlatform | '')
                }
              >
                <option disabled value="">
                  {t('support.placeholder.platform')}
                </option>
                {SUPPORT_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platformLabel(platform)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={topicId}>
                {t('support.field.topic')}
              </label>
              <select
                className={
                  invalidField === 'topic'
                    ? `${styles.select} ${styles.selectInvalid}`
                    : styles.select
                }
                id={topicId}
                value={values.topic}
                onChange={(event) =>
                  setField('topic', event.target.value as SupportTopic | '')
                }
              >
                <option disabled value="">
                  {t('support.placeholder.topic')}
                </option>
                {SUPPORT_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topicLabel(topic)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.divider} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor={messageId}>
                {t('support.field.message')}
              </label>
              <textarea
                className={
                  invalidField === 'message'
                    ? `${styles.textarea} ${styles.textareaInvalid}`
                    : styles.textarea
                }
                id={messageId}
                placeholder={t('support.placeholder.message')}
                value={values.message}
                onChange={(event) => setField('message', event.target.value)}
              />
            </div>

            <button className={styles.submit} disabled={isSubmitting} type="submit">
              {isSubmitting ? t('support.submit.sending') : t('support.submit')}
            </button>
          </form>
        </section>
      ) : (
        <section className={styles.success} aria-live="polite">
          <div aria-hidden="true" className={styles.successIcon}>
            🧡
          </div>
          <h2 className={styles.successTitle}>{t('support.success.title')}</h2>
          <p className={styles.successBody}>{t('support.success.body')}</p>
        </section>
      )}

      <LegalNav className={styles.legalNav} current="support" showHome={false} />

      <footer className={styles.footer}>
        {t('support.footer.before')}
        <Link to="/">{t('support.footer.home')}</Link>
        {t('support.footer.mid')}
        <a
          href="https://www.instagram.com/run.relay/"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('support.footer.instagram')}
        </a>
      </footer>

      <iframe name="hidden_iframe" title="support" style={{ display: 'none' }} />
    </main>
  );
}
