import styles from './skeleton.module.css';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  radius?: 'sm' | 'md' | 'lg' | 'pill';
  tone?: 'dark' | 'light';
  /** Accessible label for the loading region */
  label?: string;
}

export function Skeleton({
  className,
  width,
  height,
  radius = 'md',
  tone = 'dark',
  label
}: SkeletonProps): React.JSX.Element {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? '1rem'
  };

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`${styles.bone} ${styles[`radius_${radius}`]} ${styles[`tone_${tone}`]} ${className ?? ''}`}
      role={label ? 'status' : undefined}
      style={style}
    />
  );
}

export interface SkeletonStackProps {
  count?: number;
  gap?: string;
  children?: React.ReactNode;
  label?: string;
  className?: string;
  tone?: 'dark' | 'light';
}

export function SkeletonStack({
  count = 3,
  gap = '0.65rem',
  children,
  label,
  className,
  tone = 'dark'
}: SkeletonStackProps): React.JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={`${styles.stack} ${className ?? ''}`}
      role="status"
      style={{ gap }}
    >
      {children ??
        Array.from({ length: count }, (_, index) => (
          <Skeleton height="4.5rem" key={index} radius="lg" tone={tone} />
        ))}
    </div>
  );
}
