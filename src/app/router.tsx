import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  AdminAuthGate,
  AdminEventCodesPage,
  AdminLoginPage,
  AdminOrganizerDetailPage,
  AdminOrganizersPage,
  AdminOverviewPage,
  AdminRaceEventsPage,
  AdminRacesPage,
  AdminReviewsPage,
  AdminUsersPage
} from '@/features/admin';
import { LandingPage } from '@/features/landing';
import { PrivacyPolicyPage, TermsOfUsePage } from '@/features/legal';
import { RaceFormPage } from '@/features/race-form';
import { ResetPasswordPage } from '@/features/reset-password';
import { SentPage } from '@/features/sent';
import { SupportPage } from '@/features/support';
import {
  OrganizerAuthGate,
  OrganizerHomePage,
  OrganizerLoginPage,
  OrganizerPortalPage
} from '@/features/organizer';

function themeForPath(pathname: string): 'landing' | 'form' | 'reset' | 'admin' {
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/organizer' ||
    pathname.startsWith('/organizer/')
  ) {
    return 'admin';
  }
  if (
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/__/auth/action' ||
    pathname === '/__/auth/links' ||
    pathname === '/auth/action'
  ) {
    return 'reset';
  }
  if (pathname === '/sent' || pathname.startsWith('/race')) {
    return 'form';
  }
  return 'landing';
}

function ThemeSync(): null {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = themeForPath(location.pathname);
  }, [location.pathname]);

  return null;
}

export function AppRouter(): React.JSX.Element {
  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfUsePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/race/:raceId" element={<RaceFormPage />} />
        <Route path="/race" element={<RaceFormPage />} />
        <Route path="/sent" element={<SentPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password/*" element={<ResetPasswordPage />} />
        <Route path="/__/auth/action" element={<ResetPasswordPage />} />
        <Route path="/__/auth/links" element={<ResetPasswordPage />} />
        <Route path="/auth/action" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/organizer" element={<Outlet />}>
          <Route path="login" element={<OrganizerLoginPage />} />
          <Route element={<OrganizerAuthGate />}>
            <Route index element={<OrganizerHomePage />} />
            <Route path="events/:eventId" element={<OrganizerPortalPage />} />
            <Route path="events/:eventId/:tab" element={<OrganizerPortalPage />} />
          </Route>
        </Route>
        <Route path="/admin" element={<AdminAuthGate />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="races" element={<AdminRacesPage />} />
          <Route path="races/:raceId" element={<AdminRaceEventsPage />} />
          <Route path="event-codes" element={<AdminEventCodesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="organizers" element={<AdminOrganizersPage />} />
          <Route path="organizers/:organizerId" element={<AdminOrganizerDetailPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
