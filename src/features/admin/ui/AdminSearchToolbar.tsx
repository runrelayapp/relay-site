import type { FormEvent, ReactNode } from 'react';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';

interface AdminSearchToolbarProps {
  modeLabel: string;
  placeholder: string;
  query: string;
  inputType?: 'text' | 'date' | 'search';
  isSubmitting?: boolean;
  showClear?: boolean;
  onQueryChange: (value: string) => void;
  onOpenFilter: () => void;
  onSubmit: (event: FormEvent) => void;
  onClear?: () => void;
  trailingAction?: ReactNode;
}

export function AdminSearchToolbar({
  modeLabel,
  placeholder,
  query,
  inputType = 'text',
  isSubmitting = false,
  showClear = false,
  onQueryChange,
  onOpenFilter,
  onSubmit,
  onClear,
  trailingAction
}: AdminSearchToolbarProps): React.JSX.Element {
  return (
    <form className={consoleStyles.tableTools} onSubmit={onSubmit}>
      <input
        className={consoleStyles.tableSearch}
        placeholder={placeholder}
        type={inputType}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label={placeholder}
      />
      <button
        className={consoleStyles.secondary}
        type="button"
        onClick={onOpenFilter}
      >
        {modeLabel}
      </button>
      <button className={consoleStyles.secondary} disabled={isSubmitting} type="submit">
        {isSubmitting ? t('admin.loading') : t('admin.search.submit')}
      </button>
      {showClear && onClear ? (
        <button className={consoleStyles.secondary} type="button" onClick={onClear}>
          {t('admin.races.search.clear')}
        </button>
      ) : null}
      {trailingAction}
    </form>
  );
}

interface AdminIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

export function AdminIconButton({
  label,
  onClick,
  children
}: AdminIconButtonProps): React.JSX.Element {
  return (
    <button
      aria-label={label}
      className={consoleStyles.secondary}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function PlusIcon(): React.JSX.Element {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
