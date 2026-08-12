import { t } from '@/shared/lib/i18n';
import '@/features/race-form/styles/race-form.css';
import '../styles/sent.css';

export function SentPage(): React.JSX.Element {
  return (
    <main className="page sent">
      <div className="sent__icon" aria-hidden="true">
        ♥
      </div>
      <p className="eyebrow">{t('sent.eyebrow')}</p>
      <h1 className="headline">{t('sent.headline')}</h1>
      <p className="lede sent__lede">{t('sent.lede')}</p>
    </main>
  );
}
