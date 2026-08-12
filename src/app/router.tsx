import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { LandingPage } from '@/features/landing';
import { RaceFormPage } from '@/features/race-form';
import { ResetPasswordPage } from '@/features/reset-password';
import { SentPage } from '@/features/sent';

function themeForPath(pathname: string): 'landing' | 'form' | 'reset' {
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
        <Route path="/race/:raceId" element={<RaceFormPage />} />
        <Route path="/race" element={<RaceFormPage />} />
        <Route path="/sent" element={<SentPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password/*" element={<ResetPasswordPage />} />
        <Route path="/__/auth/action" element={<ResetPasswordPage />} />
        <Route path="/__/auth/links" element={<ResetPasswordPage />} />
        <Route path="/auth/action" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
