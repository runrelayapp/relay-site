import { t } from '@/shared/lib/i18n';

interface TextPanelProps {
  isActive: boolean;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}

export function TextPanel({
  isActive,
  value,
  maxLength,
  onChange
}: TextPanelProps): React.JSX.Element {
  return (
    <section
      className="panel"
      id="panel-text"
      role="tabpanel"
      aria-labelledby="tab-text"
      data-active={isActive ? 'true' : 'false'}
    >
      <div className="text-area-wrap">
        <label className="section-label" htmlFor="text-input">
          {t('race.text.label')}
        </label>
        <textarea
          id="text-input"
          className="text-area"
          rows={5}
          maxLength={maxLength}
          placeholder={t('race.text.placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onPaste={(e) => {
            const paste = e.clipboardData.getData('text');
            if (value.length + paste.length > maxLength) {
              e.preventDefault();
              onChange((value + paste).slice(0, maxLength));
            }
          }}
        />
        <p
          className="char-count"
          aria-live="polite"
          data-at-limit={value.length >= maxLength ? 'true' : 'false'}
        >
          {value.length} / {maxLength}
        </p>
      </div>
    </section>
  );
}
