const STORAGE_KEY = 'relay.admin.sidebarExpanded';
const MOBILE_QUERY = '(max-width: 767px)';

export function isAdminMobileViewport(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function readAdminSidebarExpanded(): boolean {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === '0') {
    return false;
  }
  if (stored === '1') {
    return true;
  }
  return !isAdminMobileViewport();
}

export function writeAdminSidebarExpanded(isExpanded: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, isExpanded ? '1' : '0');
}
