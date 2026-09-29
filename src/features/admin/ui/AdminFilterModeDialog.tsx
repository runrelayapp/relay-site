import { Dialog } from '@/shared/ui/dialog';
import { t } from '@/shared/lib/i18n';
import styles from '../styles/admin.module.css';

export interface AdminFilterModeOption<T extends string> {
  value: T;
  label: string;
}

interface AdminFilterModeDialogProps<T extends string> {
  isOpen: boolean;
  title: string;
  description?: string;
  options: AdminFilterModeOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function AdminFilterModeDialog<T extends string>({
  isOpen,
  title,
  description,
  options,
  selected,
  onSelect,
  onClose
}: AdminFilterModeDialogProps<T>): React.JSX.Element {
  return (
    <Dialog
      isOpen={isOpen}
      title={title}
      description={description}
      closeLabel={t('admin.cancel')}
      onClose={onClose}
      actions={
        <button className={styles.ghostButton} type="button" onClick={onClose}>
          {t('admin.cancel')}
        </button>
      }
    >
      <ul className={styles.modeList}>
        {options.map((option) => {
          const isActive = option.value === selected;
          return (
            <li key={option.value}>
              <button
                aria-pressed={isActive}
                className={
                  isActive
                    ? `${styles.modeOption} ${styles.modeOptionActive}`
                    : styles.modeOption
                }
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
