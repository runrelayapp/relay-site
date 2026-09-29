import { Link } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import type { AdminRaceSummary } from '../model/types';
import {
  adminRaceRunnerDisplayName,
  adminRaceStatusClass,
  adminRaceStatusLabel,
  formatAdminRaceDateDisplay
} from '../lib/adminRaceDisplay';
import styles from '../styles/admin.module.css';

export interface AdminRaceDetailPanelProps {
  race: AdminRaceSummary;
}

export function AdminRaceDetailPanel({ race }: AdminRaceDetailPanelProps): React.JSX.Element {
  const runnerName = adminRaceRunnerDisplayName(race);
  const userSearchHref = `/admin/users?q=${encodeURIComponent(race.userId)}`;

  return (
    <div className={consoleStyles.infoGrid}>
      <div className={consoleStyles.infoCard}>
        <h3>{t('admin.race.detail.runnerTitle')}</h3>
        {race.runnerUserMissing ? (
          <p className={styles.runnerDeletedNotice}>{t('admin.race.detail.runnerDeleted')}</p>
        ) : null}
        <div className={consoleStyles.infoRow}>
          <span>{t('admin.race.detail.runnerName')}</span>
          <strong>{runnerName}</strong>
        </div>
        <div className={consoleStyles.infoRow}>
          <span>{t('admin.race.detail.userId')}</span>
          <code className={styles.codeSmall}>{race.userId}</code>
        </div>
        {!race.runnerUserMissing && race.runnerEmail ? (
          <div className={consoleStyles.infoRow}>
            <span>{t('admin.race.detail.email')}</span>
            <span>{race.runnerEmail}</span>
          </div>
        ) : null}
        {!race.runnerUserMissing && race.runnerRelayPlus ? (
          <div className={consoleStyles.infoRow}>
            <span>{t('admin.users.table.relayPlus')}</span>
            <span>{t('admin.users.relayPlusOn')}</span>
          </div>
        ) : null}
        <Link className={`${consoleStyles.secondary} ${styles.detailCardAction}`} to={userSearchHref}>
          {t('admin.race.detail.openUser')}
        </Link>
      </div>

      <div className={consoleStyles.infoCard}>
        <h3>{t('admin.race.detail.raceTitle')}</h3>
        <div className={consoleStyles.infoRow}>
          <span>{t('admin.races.table.race')}</span>
          <strong>{race.raceName}</strong>
        </div>
        <div className={consoleStyles.infoRow}>
          <span>{t('admin.races.table.date')}</span>
          <span>{formatAdminRaceDateDisplay(race.raceDate)}</span>
        </div>
        <div className={consoleStyles.infoRow}>
          <span>{t('admin.races.table.status')}</span>
          <span className={adminRaceStatusClass(race.status)}>
            {adminRaceStatusLabel(race.status)}
          </span>
        </div>
        {race.eventCode ? (
          <div className={consoleStyles.infoRow}>
            <span>{t('admin.races.table.eventCode')}</span>
            <code className={styles.codeSmall}>{race.eventCode}</code>
          </div>
        ) : null}
        {race.distanceMiles != null && Number.isFinite(race.distanceMiles) ? (
          <div className={consoleStyles.infoRow}>
            <span>{t('admin.race.detail.distance')}</span>
            <span>{t('admin.race.detail.distanceMiles', { miles: race.distanceMiles })}</span>
          </div>
        ) : null}
        <div className={consoleStyles.infoRow}>
          <span>{t('admin.races.table.raceId')}</span>
          <code className={styles.codeSmall}>{race.id}</code>
        </div>
      </div>
    </div>
  );
}
