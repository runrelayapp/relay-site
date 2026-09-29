import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { t } from "@/shared/lib/i18n";
import styles from "../styles/admin.module.css";

interface AdminSidebarProps {
  isExpanded: boolean;
  isOverlay: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

interface AdminNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
}

function UsersIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M16 19v-1.2A3.8 3.8 0 0 0 12.2 14H7.8A3.8 3.8 0 0 0 4 17.8V19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="10" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M20 19v-1.1A3.2 3.2 0 0 0 17.4 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M16.2 5.6a3.2 3.2 0 0 1 0 5.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EventsIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect
        height="14"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="6"
      />
      <path
        d="M8 4v4M16 4v4M4 11h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RacesIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M6 20V5.2c0-.7.7-1.2 1.4-.9l10.3 4.3c.8.3.8 1.4 0 1.8L7.4 14.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function OrganizersIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M4 19V8.5L12 4l8 4.5V19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 19v-6h6v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ReviewsIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M12 4.4 13.9 9h4.9l-4 3 1.5 4.8L12 14.2 7.7 16.8 9.2 12l-4-3h4.9L12 4.4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronIcon({
  isExpanded,
}: {
  isExpanded: boolean;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={
        isExpanded
          ? styles.sidebarChevron
          : `${styles.sidebarChevron} ${styles.sidebarChevronCollapsed}`
      }
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function navItems(): AdminNavItem[] {
  return [
    {
      to: "/admin/users",
      label: t("admin.nav.users"),
      icon: <UsersIcon />,
      isActive: (pathname) => pathname.startsWith("/admin/users"),
    },
    {
      to: "/admin/event-codes",
      label: t("admin.nav.events"),
      icon: <EventsIcon />,
      isActive: (pathname) => pathname.startsWith("/admin/event-codes"),
    },
    {
      to: "/admin",
      label: t("admin.nav.races"),
      icon: <RacesIcon />,
      isActive: (pathname) =>
        pathname === "/admin" || pathname.startsWith("/admin/races"),
    },
    {
      to: "/admin/organizers",
      label: t("admin.nav.organizers"),
      icon: <OrganizersIcon />,
      isActive: (pathname) => pathname.startsWith("/admin/organizers"),
    },
    {
      to: "/admin/reviews",
      label: t("admin.nav.reviews"),
      icon: <ReviewsIcon />,
      isActive: (pathname) => pathname.startsWith("/admin/reviews"),
    },
  ];
}

export function AdminSidebar({
  isExpanded,
  isOverlay,
  onToggle,
  onNavigate,
}: AdminSidebarProps): React.JSX.Element {
  const location = useLocation();
  const items = navItems();
  const toggleLabel = isExpanded
    ? t("admin.nav.collapse")
    : t("admin.nav.expand");

  return (
    <aside
      aria-label={t("admin.nav.label")}
      className={
        isExpanded
          ? `${styles.sidebar} ${styles.sidebarExpanded}`
          : `${styles.sidebar} ${styles.sidebarCollapsed}`
      }
    >
      <div className={styles.sidebarBrand}>
        <button
          aria-expanded={isExpanded}
          aria-label={toggleLabel}
          className={styles.sidebarToggle}
          title={toggleLabel}
          type="button"
          onClick={onToggle}
        >
          <ChevronIcon isExpanded={isExpanded} />
        </button>
        <p className={styles.sidebarBrandText}>{t("admin.brand")}</p>
      </div>

      <nav className={styles.sidebarNav}>
        {items.map((item) => {
          const isActive = item.isActive(location.pathname);
          return (
            <Link
              key={item.to}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={
                isActive
                  ? `${styles.sidebarLink} ${styles.sidebarLinkActive}`
                  : styles.sidebarLink
              }
              title={item.label}
              to={item.to}
              onClick={onNavigate}
            >
              <span className={styles.sidebarIcon}>{item.icon}</span>
              <span className={styles.sidebarLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        aria-hidden={!isOverlay}
        className={styles.sidebarCloseMobile}
        tabIndex={isOverlay ? 0 : -1}
        type="button"
        onClick={onToggle}
      >
        {t("admin.nav.close")}
      </button>
    </aside>
  );
}
