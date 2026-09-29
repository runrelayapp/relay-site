import { useOutletContext } from 'react-router-dom';
import type { OrganizerSession } from '../hooks/useOrganizerSession';
import { OrganizerLayout } from './OrganizerLayout';

interface OrganizerShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function OrganizerShell({
  children,
  title,
  subtitle
}: OrganizerShellProps): React.JSX.Element {
  const session = useOutletContext<OrganizerSession>();

  return (
    <OrganizerLayout session={session} heroTitle={title} heroSubtitle={subtitle}>
      {children}
    </OrganizerLayout>
  );
}
