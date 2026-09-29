import { t } from '@/shared/lib/i18n';

import relayLogo from '@/shared/assets/brand/relay-logo.png';

export function BrandHeader(): React.JSX.Element {
  return (
    <header className="brand" aria-label={t('race.brandAria')}>
      <img
        alt=""
        aria-hidden="true"
        className="brand__icon"
        height={24}
        src={relayLogo}
        width={24}
      />
      <span className="brand__name">relay</span>
    </header>
  );
}
