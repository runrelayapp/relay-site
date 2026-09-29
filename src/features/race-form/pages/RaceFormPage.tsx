import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import { LegalNav } from '@/shared/ui/legal-nav';
import { Skeleton } from '@/shared/ui/skeleton';
import { parsePageContext } from '../lib/page-context';
import { resolveRaceGate, resolveRunnerDisplayName } from '../lib/race-gate';
import type { PageContext, RaceGateFail } from '../model/types';
import { BrandHeader } from '../ui/BrandHeader';
import { RaceFormScreen } from '../ui/RaceFormScreen';
import '../styles/race-form.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'unavailable'; title: string; body: string; eyebrow: string }
  | { status: 'ready'; context: PageContext; runnerName: string };

function RaceFormLoadingSkeleton(): React.JSX.Element {
  return (
    <main className="page" aria-busy="true" aria-label={t('race.loading')}>
      <BrandHeader />
      <div className="race-form-skeleton">
        <Skeleton height="0.75rem" radius="pill" tone="light" width="8rem" />
        <div style={{ height: '0.85rem' }} />
        <Skeleton height="2.1rem" radius="md" tone="light" width="75%" />
        <div style={{ height: '0.55rem' }} />
        <Skeleton height="1rem" radius="md" tone="light" width="95%" />
        <div style={{ height: '0.35rem' }} />
        <Skeleton height="1rem" radius="md" tone="light" width="70%" />
        <div style={{ height: '1.5rem' }} />
        <Skeleton height="5.5rem" radius="lg" tone="light" />
        <div style={{ height: '0.85rem' }} />
        <Skeleton height="7rem" radius="lg" tone="light" />
        <div style={{ height: '0.85rem' }} />
        <Skeleton height="9rem" radius="lg" tone="light" />
        <div style={{ height: '1.25rem' }} />
        <Skeleton height="3rem" radius="lg" tone="light" />
      </div>
    </main>
  );
}

export function RaceFormPage(): React.JSX.Element {
  const { raceId: routeRaceId } = useParams<{ raceId: string }>();
  const location = useLocation();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const firebaseCtx = getFirebaseContext();
    const baseContext = parsePageContext(location.pathname, location.search, routeRaceId);

    void (async () => {
      const gate = await resolveRaceGate(firebaseCtx, baseContext);
      if (cancelled) {
        return;
      }
      if (!gate.ok) {
        const fail = gate as RaceGateFail;
        setState({
          status: 'unavailable',
          title: fail.title,
          body: fail.body,
          eyebrow: fail.eyebrow ?? t('race.unavailable.eyebrow')
        });
        return;
      }

      setState({
        status: 'ready',
        context: gate.context,
        runnerName: gate.context.name
      });

      const runnerName = await resolveRunnerDisplayName(firebaseCtx, gate.context);
      if (cancelled) {
        return;
      }
      setState({
        status: 'ready',
        context: { ...gate.context, name: runnerName },
        runnerName
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, routeRaceId]);

  if (state.status === 'loading') {
    return <RaceFormLoadingSkeleton />;
  }

  if (state.status === 'unavailable') {
    return (
      <main className="page">
        <BrandHeader />
        <section className="race-unavailable">
          <p className="eyebrow">{state.eyebrow}</p>
          <h1 className="headline">{state.title}</h1>
          <p className="lede">{state.body}</p>
          <LegalNav showHome={false} tone="form" />
        </section>
      </main>
    );
  }

  return (
    <RaceFormScreen
      context={state.context}
      firebaseCtx={getFirebaseContext()}
      runnerName={state.runnerName}
    />
  );
}
