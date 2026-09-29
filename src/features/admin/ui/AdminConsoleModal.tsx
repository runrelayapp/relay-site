import type { ReactNode } from 'react';
import { ConsoleModal } from '@/shared/ui/console-modal';

export interface AdminConsoleModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  hideFooter?: boolean;
}

export function AdminConsoleModal(props: AdminConsoleModalProps): React.JSX.Element | null {
  return <ConsoleModal {...props} />;
}
