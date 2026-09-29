import type { ReactNode } from 'react';
import consoleStyles from '@/shared/styles/console.module.css';

interface AdminShellProps {
  children: ReactNode;
  title: string;
  lede?: string;
}

export function AdminShell({ children, title, lede }: AdminShellProps): React.JSX.Element {
  return (
    <>
      <div className={consoleStyles.pageHead}>
        <h2>{title}</h2>
        {lede ? <p>{lede}</p> : null}
      </div>
      {children}
    </>
  );
}
