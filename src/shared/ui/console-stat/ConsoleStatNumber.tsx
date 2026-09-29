import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { Skeleton } from '@/shared/ui/skeleton';

export interface ConsoleStatNumberProps {
  isLoading: boolean;
  value: number | null | undefined;
  formatValue?: (value: number) => string;
}

export function ConsoleStatNumber({
  isLoading,
  value,
  formatValue
}: ConsoleStatNumberProps): React.JSX.Element {
  if (isLoading) {
    return (
      <Skeleton
        className={consoleStyles.statNumBone}
        height="1.75rem"
        label={t('console.stat.loading')}
        radius="md"
        width="3.5rem"
      />
    );
  }

  if (value == null) {
    return <>—</>;
  }

  const text = formatValue ? formatValue(value) : value.toLocaleString();
  return <>{text}</>;
}
