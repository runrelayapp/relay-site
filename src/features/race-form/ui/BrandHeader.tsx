export function BrandHeader(): React.JSX.Element {
  return (
    <header className="brand" aria-label="relay">
      <svg className="brand__icon" viewBox="0 0 22 14" fill="none" aria-hidden="true">
        <path
          d="M3.67361 9.15801C5.0898 9.15801 6.23785 8.00997 6.23785 6.59378C6.23785 5.17759 5.0898 4.02954 3.67361 4.02954C2.25742 4.02954 1.10938 5.17759 1.10938 6.59378C1.10938 8.00997 2.25742 9.15801 3.67361 9.15801Z"
          stroke="currentColor"
          strokeWidth="0.88"
        />
        <path
          d="M18.3264 9.15801C19.7426 9.15801 20.8906 8.00997 20.8906 6.59378C20.8906 5.17759 19.7426 4.02954 18.3264 4.02954C16.9102 4.02954 15.7621 5.17759 15.7621 6.59378C15.7621 8.00997 16.9102 9.15801 18.3264 9.15801Z"
          stroke="currentColor"
          strokeWidth="0.88"
        />
        <path
          d="M5.13889 4.39583C9.04629 0.488419 12.9537 0.488419 16.8611 4.39583"
          stroke="currentColor"
          strokeWidth="0.88"
          strokeLinecap="round"
        />
        <path
          d="M11.8355 1.9784L9.98724 2.43922C9.71241 2.50775 9.54517 2.78608 9.61369 3.06091L9.63142 3.13199C9.69994 3.40682 9.97828 3.57406 10.2531 3.50554L12.1014 3.04471C12.3762 2.97619 12.5434 2.69785 12.4749 2.42303L12.4572 2.35194C12.3887 2.07712 12.1103 1.90988 11.8355 1.9784Z"
          fill="currentColor"
        />
      </svg>
      <span className="brand__name">relay</span>
    </header>
  );
}
