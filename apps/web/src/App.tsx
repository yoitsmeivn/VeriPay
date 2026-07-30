import { useMemo } from 'react';

import { HealthStatus } from './components/health-status.js';
import { browserEnv } from './env.js';
import { createApiClient } from './lib/api-client.js';

/**
 * Application root.
 *
 * Intentionally a placeholder. The real VeriPay interface is not part of this
 * scaffold — this screen exists to prove the frontend, the API and the shared
 * contract package are wired together correctly.
 */
export function App(): React.JSX.Element {
  // Stable across renders so HealthStatus's effect does not refetch in a loop.
  const client = useMemo(() => createApiClient({ baseUrl: browserEnv.VITE_API_BASE_URL }), []);

  return (
    <main className="app">
      <header className="app__header">
        <h1>VeriPay</h1>
        <p className="app__tagline">Peer-to-peer conditional payments</p>
      </header>

      <section className="app__panel" aria-labelledby="api-status-heading">
        <h2 id="api-status-heading">API status</h2>
        <HealthStatus client={client} />
        <p className="app__hint">
          Talking to <code>{browserEnv.VITE_API_BASE_URL}</code>
        </p>
      </section>
    </main>
  );
}
