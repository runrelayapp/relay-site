import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFirebaseContext } from "@/shared/firebase";
import { t } from "@/shared/lib/i18n";
import consoleStyles from "@/shared/styles/console.module.css";
import { fetchAdminOverviewLifetimeStats } from "../api/adminOverviewStats";
import { listAdminEventCodes } from "../api/adminEventCodesRepository";
import { AdminShell } from "../ui/AdminShell";
import styles from "../styles/admin.module.css";
import { ConsoleStatNumber } from "@/shared/ui/console-stat";

interface OverviewStats {
  organizers: number;
  eventCodes: number;
  users: number;
  races: number;
  messagesSent: number;
}

export function AdminOverviewPage(): React.JSX.Element {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentCodes, setRecentCodes] = useState<
    Awaited<ReturnType<typeof listAdminEventCodes>>
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      setError(t("admin.unavailable"));
      return;
    }

    void (async () => {
      try {
        const [platformCounts, codes] = await Promise.all([
          fetchAdminOverviewLifetimeStats(firebaseCtx),
          listAdminEventCodes(firebaseCtx),
        ]);
        setStats(platformCounts);
        setRecentCodes(codes.slice(0, 5));
        setError("");
      } catch {
        setError(t("admin.overview.loadError"));
      }
    })();
  }, []);

  const isStatsLoading = stats == null && !error;

  return (
    <AdminShell
      title={t("admin.overview.title")}
      lede={t("admin.overview.lede")}
    >
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={consoleStyles.cards}>
        <div className={consoleStyles.stat}>
          <div className={consoleStyles.statNum}>
            <ConsoleStatNumber isLoading={isStatsLoading} value={stats?.organizers} />
          </div>
          <div className={consoleStyles.statLabel}>
            {t("admin.overview.stat.organizers")}
          </div>
          <div className={consoleStyles.statSub}>
            {t("admin.overview.stat.organizersSub")}
          </div>
        </div>
        <div className={consoleStyles.stat}>
          <div className={consoleStyles.statNum}>
            <ConsoleStatNumber isLoading={isStatsLoading} value={stats?.eventCodes} />
          </div>
          <div className={consoleStyles.statLabel}>
            {t("admin.overview.stat.events")}
          </div>
          <div className={consoleStyles.statSub}>
            {t("admin.overview.stat.eventsSub")}
          </div>
        </div>
        <div className={consoleStyles.stat}>
          <div className={consoleStyles.statNum}>
            <ConsoleStatNumber isLoading={isStatsLoading} value={stats?.users} />
          </div>
          <div className={consoleStyles.statLabel}>
            {t("admin.overview.stat.users")}
          </div>
          <div className={consoleStyles.statSub}>
            {t("admin.overview.stat.usersSub")}
          </div>
        </div>
        <div className={consoleStyles.stat}>
          <div className={consoleStyles.statNum}>
            <ConsoleStatNumber isLoading={isStatsLoading} value={stats?.races} />
          </div>
          <div className={consoleStyles.statLabel}>
            {t("admin.overview.stat.races")}
          </div>
          <div className={consoleStyles.statSub}>
            {t("admin.overview.stat.racesSub")}
          </div>
        </div>
        <div className={consoleStyles.stat}>
          <div className={consoleStyles.statNum}>
            <ConsoleStatNumber
              formatValue={(value) => value.toLocaleString()}
              isLoading={isStatsLoading}
              value={stats?.messagesSent}
            />
          </div>
          <div className={consoleStyles.statLabel}>
            {t("admin.overview.stat.messages")}
          </div>
          <div className={consoleStyles.statSub}>
            {t("admin.overview.stat.messagesSub")}
          </div>
        </div>
      </div>

      <div className={consoleStyles.grid2}>
        <div className={consoleStyles.panel}>
          <div className={consoleStyles.panelHead}>
            <h3>{t("admin.overview.recentEvents")}</h3>
            <Link className={consoleStyles.secondary} to="/admin/event-codes">
              {t("admin.overview.manageEvents")}
            </Link>
          </div>
          <div className={consoleStyles.tableWrap}>
            <table className={consoleStyles.dataTable}>
              <thead>
                <tr>
                  <th>{t("admin.overview.table.event")}</th>
                  <th>{t("admin.eventCodes.table.organizer")}</th>
                  <th>{t("admin.eventCodes.table.code")}</th>
                </tr>
              </thead>
              <tbody>
                {recentCodes.length === 0 ? (
                  <tr>
                    <td className={consoleStyles.empty} colSpan={3}>
                      {t("admin.eventCodes.empty")}
                    </td>
                  </tr>
                ) : (
                  recentCodes.map((item) => (
                    <tr key={item.code}>
                      <td>
                        <strong>{item.eventName || item.code}</strong>
                      </td>
                      <td>{item.organizerDirectoryName || item.organizerName || "—"}</td>
                      <td>
                        <span className={consoleStyles.eventCode}>
                          {item.code}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
