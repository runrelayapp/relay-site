import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import styles from './dialog.module.css';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: 'default' | 'danger';
}

/**
 * Shared dialog: backdrop, title, optional description/body, actions.
 * Focus returns to the previously focused element on close.
 */
export function Dialog({
  isOpen,
  title,
  description,
  closeLabel,
  onClose,
  children,
  actions,
  tone = 'default'
}: DialogProps): React.JSX.Element | null {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), textarea, select'
    );
    if (firstField) {
      firstField.focus();
    } else {
      closeButtonRef.current?.focus();
      panel?.focus();
    }

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
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={() => onCloseRef.current()}
    >
      <div
        ref={panelRef}
        aria-describedby={description || children ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`${styles.panel} ${tone === 'danger' ? styles.panelDanger : ''}`}
        role="dialog"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {description ? (
          <p className={styles.description} id={descriptionId}>
            {description}
          </p>
        ) : null}
        {children ? (
          <div className={styles.body} id={description ? undefined : descriptionId}>
            {children}
          </div>
        ) : null}
        <div className={styles.actions}>
          {actions ?? (
            <button
              ref={closeButtonRef}
              className={styles.primaryButton}
              type="button"
              onClick={() => onCloseRef.current()}
            >
              {closeLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
