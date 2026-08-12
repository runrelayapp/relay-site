import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import '../styles/reset-password.css';

interface ActionParams {
  mode: string;
  oobCode: string;
  apiKey: string | null;
  continueUrl: string | null;
  lang: string | null;
}

function getActionParams(search: string, hash: string): ActionParams | null {
  const params = new URLSearchParams(search || hash.replace(/^#/, '?'));

  let mode = params.get('mode');
  let oobCode = params.get('oobCode');
  let apiKey = params.get('apiKey');
  let continueUrl = params.get('continueUrl');
  let lang = params.get('lang');

  if (mode && oobCode) {
    return { mode, oobCode, apiKey, continueUrl, lang };
  }

  const nestedLink = params.get('link');
  if (nestedLink) {
    try {
      const nested = new URL(decodeURIComponent(nestedLink));
      const nestedParams = new URLSearchParams(nested.search);
      mode = nestedParams.get('mode');
      oobCode = nestedParams.get('oobCode');
      apiKey = nestedParams.get('apiKey');
      continueUrl = nestedParams.get('continueUrl');
      lang = nestedParams.get('lang');
      if (mode && oobCode) {
        return { mode, oobCode, apiKey, continueUrl, lang };
      }
    } catch {
      /* ignore malformed nested link */
    }
  }

  return null;
}

function isMobile(): boolean {
  return (
    /Android|iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function buildAppResetUrl(mode: string, oobCode: string): string {
  return `relayapp://reset-password?mode=${encodeURIComponent(mode)}&oobCode=${encodeURIComponent(oobCode)}`;
}

export function ResetPasswordPage(): React.JSX.Element {
  const location = useLocation();
  const [status, setStatus] = useState(t('reset.status.idle'));
  const [appUrl, setAppUrl] = useState<string | null>(null);

  useEffect(() => {
    const action = getActionParams(location.search, location.hash);
    if (!action) {
      setStatus(t('reset.status.missing'));
      setAppUrl(null);
      return;
    }

    if (action.mode === 'resetPassword') {
      const url = buildAppResetUrl(action.mode, action.oobCode);
      setAppUrl(url);
      setStatus(isMobile() ? t('reset.status.opening') : t('reset.status.desktop'));
      window.location.href = url;
      return;
    }

    setStatus(t('reset.status.other'));
    setAppUrl(null);
  }, [location.search, location.hash]);

  return (
    <div className="reset-password">
      <p className="reset-password__status">{status}</p>
      {appUrl ? (
        <a className="reset-password__button" href={appUrl}>
          {t('reset.openApp')}
        </a>
      ) : null}
    </div>
  );
}
