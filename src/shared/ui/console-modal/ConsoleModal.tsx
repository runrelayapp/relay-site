import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';

export interface ConsoleModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  hideFooter?: boolean;
  closeAriaLabel?: string;
}

export function ConsoleModal({
  isOpen,
  title,
  onClose,
  children,
  onSave,
  saveLabel,
  cancelLabel,
  isSaving = false,
  hideFooter = false,
  closeAriaLabel
}: ConsoleModalProps): React.JSX.Element | null {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={consoleStyles.overlay}
      role="presentation"
      onClick={() => onCloseRef.current()}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={consoleStyles.modal}
        role="dialog"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={consoleStyles.modalHead}>
          <h3 id={titleId}>{title}</h3>
          <button
            className={consoleStyles.modalClose}
            type="button"
            aria-label={closeAriaLabel ?? t('admin.modal.close')}
            onClick={() => onCloseRef.current()}
          >
            ×
          </button>
        </div>
        <div className={consoleStyles.modalBody}>{children}</div>
        {!hideFooter ? (
          <div className={consoleStyles.modalFoot}>
            <button
              className={consoleStyles.secondary}
              disabled={isSaving}
              type="button"
              onClick={() => onCloseRef.current()}
            >
              {cancelLabel ?? t('admin.cancel')}
            </button>
            {onSave ? (
              <button
                className={consoleStyles.primary}
                disabled={isSaving}
                type="button"
                onClick={onSave}
              >
                {isSaving ? t('admin.loading') : saveLabel ?? t('admin.modal.save')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
