import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getFirebaseContext } from '@/shared/firebase';
import { t } from '@/shared/lib/i18n';
import { parsePageContext } from '../lib/page-context';
import { resolveRaceGate, resolveRunnerDisplayName } from '../lib/race-gate';
import type { PageContext, RaceGateFail } from '../model/types';
import { BrandHeader } from '../ui/BrandHeader';
import { RaceFormScreen } from '../ui/RaceFormScreen';
import '../styles/race-form.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'unavailable'; title: string; body: string }
  | { status: 'ready'; context: PageContext; runnerName: string };

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
        setState({ status: 'unavailable', title: fail.title, body: fail.body });
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
    return (
      <main className="page">
        <BrandHeader />
        <p className="eyebrow">{t('race.loading')}</p>
      </main>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <main className="page">
        <BrandHeader />
        <section className="race-unavailable">
          <p className="eyebrow">{t('race.unavailable.eyebrow')}</p>
          <h1 className="headline">{state.title}</h1>
          <p className="lede">{state.body}</p>
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
