import { t } from '@/shared/lib/i18n';
import type { MessageFormat } from '../model/types';

interface FormatTabsProps {
  activeFormat: MessageFormat;
  onChange: (format: MessageFormat) => void;
}

export function FormatTabs({ activeFormat, onChange }: FormatTabsProps): React.JSX.Element {
  const formats: MessageFormat[] = ['voice', 'text', 'song'];

  return (
    <>
      <p className="section-label">{t('race.format.label')}</p>
      <div className="format-tabs" role="tablist" aria-label={t('race.format.tabsAria')}>
        {formats.map((format) => (
          <button
            key={format}
            type="button"
            className="format-tab"
            role="tab"
            id={`tab-${format}`}
            aria-selected={activeFormat === format}
            aria-controls={`panel-${format}`}
            data-format={format}
            onClick={() => onChange(format)}
          >
            {format === 'voice' && (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M19 11a7 7 0 0 1-14 0M12 18v3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {format === 'text' && (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7 8h10M7 12h6M5 4h14a2 2 0 0 1 2 2v12l-4-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {format === 'song' && (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 18V5l12-2v13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
            <span className="format-tab__label">
              {format === 'voice'
                ? t('race.format.voice')
                : format === 'text'
                  ? t('race.format.text')
                  : t('race.format.song')}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
