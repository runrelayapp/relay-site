import { t } from '@/shared/lib/i18n';

export function firebaseErrorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
}

export function mapSubmitErrorMessage(error: unknown): string {
  const code = firebaseErrorCode(error);

  if (code.startsWith('storage/')) {
    if (code === 'storage/no-bucket') {
      return t('error.storage.noBucket');
    }
    if (code === 'storage/bucket-not-found' || code === 'storage/unavailable') {
      return t('error.storage.bucket');
    }
    if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
      return t('error.storage.unauthorized');
    }
    if (code === 'storage/canceled') {
      return t('error.storage.canceled');
    }
    if (code === 'storage/quota-exceeded') {
      return t('error.storage.quota');
    }
    if (
      code === 'storage/retry-limit-exceeded' ||
      code === 'storage/server-file-wrong-size' ||
      code === 'storage/unknown' ||
      code === 'storage/object-not-found'
    ) {
      return t('error.storage.retry');
    }
    return t('error.storage.generic');
  }

  if (code === 'permission-denied') {
    return t('error.permission');
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return t('error.network');
  }
  if (code === 'failed-precondition') {
    return t('error.precondition');
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('cors')) {
      return t('error.cors');
    }
  }

  return error instanceof Error ? error.message : t('error.generic');
}

export function mapRaceGateError(error: unknown): { title: string; body: string } | null {
  const code = firebaseErrorCode(error);
  if (code === 'permission-denied') {
    return {
      title: t('race.unavailable.permissionTitle'),
      body: t('race.unavailable.permissionBody')
    };
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return {
      title: t('race.unavailable.connectionTitle'),
      body: t('race.unavailable.connectionBody')
    };
  }
  return null;
}
