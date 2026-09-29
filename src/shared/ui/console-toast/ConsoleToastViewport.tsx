import { useCallback, useState } from 'react';
import styles from './consoleToast.module.css';

export type ConsoleToastTone = 'success' | 'warning' | 'error';

interface ConsoleToastItem {
  id: number;
  message: string;
  tone: ConsoleToastTone;
}

const DEFAULT_DURATION_MS = 6000;

function toastClassName(tone: ConsoleToastTone): string {
  if (tone === 'warning') {
    return `${styles.toast} ${styles.toastWarning}`;
  }
  if (tone === 'error') {
    return `${styles.toast} ${styles.toastError}`;
  }
  return `${styles.toast} ${styles.toastSuccess}`;
}

export interface UseConsoleToastResult {
  showToast: (message: string, tone?: ConsoleToastTone) => void;
  viewport: React.JSX.Element | null;
}

export function useConsoleToast(): UseConsoleToastResult {
  const [toasts, setToasts] = useState<ConsoleToastItem[]>([]);

  const dismissToast = useCallback((id: number): void => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ConsoleToastTone = 'success'): void => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, message: trimmed, tone }]);
      window.setTimeout(() => dismissToast(id), DEFAULT_DURATION_MS);
    },
    [dismissToast]
  );

  const viewport =
    toasts.length > 0 ? (
      <div aria-live="polite" className={styles.viewport} role="status">
        {toasts.map((item) => (
          <div key={item.id} className={toastClassName(item.tone)}>
            {item.message}
          </div>
        ))}
      </div>
    ) : null;

  return { showToast, viewport };
}
