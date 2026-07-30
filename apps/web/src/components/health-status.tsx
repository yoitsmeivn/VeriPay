import { type HealthPayload, isAppError } from '@veripay/shared';
import { useEffect, useState } from 'react';

import { type ApiClient } from '../lib/api-client.js';

type State =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ok'; readonly health: HealthPayload }
  | { readonly kind: 'error'; readonly message: string };

export interface HealthStatusProps {
  readonly client: ApiClient;
}

/**
 * Live API status.
 *
 * This is the scaffold's proof that the whole path works end to end: browser
 * origin -> CORS allowlist -> helmet -> route -> shared schema -> back.
 */
export function HealthStatus({ client }: HealthStatusProps): React.JSX.Element {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;

    client
      .getHealth()
      .then((health) => {
        if (active) setState({ kind: 'ok', health });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          kind: 'error',
          message: isAppError(error) ? error.message : 'Unexpected error contacting the API',
        });
      });

    // Prevents a state update after unmount when the fetch is still in flight.
    return () => {
      active = false;
    };
  }, [client]);

  if (state.kind === 'loading') {
    return <p className="status status--pending">Checking API…</p>;
  }

  if (state.kind === 'error') {
    return (
      <div className="status status--error" role="alert">
        <p>API unreachable</p>
        <p className="status__detail">{state.message}</p>
      </div>
    );
  }

  return (
    <dl className="status status--ok">
      <div>
        <dt>Status</dt>
        <dd>{state.health.status}</dd>
      </div>
      <div>
        <dt>Service</dt>
        <dd>{state.health.service}</dd>
      </div>
      <div>
        <dt>Version</dt>
        <dd>{state.health.version}</dd>
      </div>
      <div>
        <dt>Uptime</dt>
        <dd>{state.health.uptimeSeconds}s</dd>
      </div>
    </dl>
  );
}
