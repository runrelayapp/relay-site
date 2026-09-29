import { Link, useSearchParams } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import { LegalNav } from '@/shared/ui/legal-nav';
import '@/features/race-form/styles/race-form.css';
import '../styles/sent.css';

export function SentPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const raceId = searchParams.get('raceId')?.trim() ?? '';

  return (
    <main className="page sent">
      <div className="sent__icon" aria-hidden="true">
        ♥
      </div>
      <p className="eyebrow">{t('sent.eyebrow')}</p>
      <h1 className="headline">{t('sent.headline')}</h1>
      <p className="lede sent__lede">{t('sent.lede')}</p>
      {raceId ? (
        <div className="sent__actions">
          <Link
            className="btn btn--primary"
            to={`/race/${encodeURIComponent(raceId)}`}
            reloadDocument
          >
            {t('sent.sendAnother')}
          </Link>
        </div>
      ) : null}
      <LegalNav showHome={false} tone="form" />
    </main>
  );
}
