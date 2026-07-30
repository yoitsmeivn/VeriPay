import { useAuth0 } from '@auth0/auth0-react';
import { type AuthPrincipal, isAppError } from '@veripay/shared';
import { useEffect, useState } from 'react';

import { useApiClient } from '../lib/use-api-client.js';

type Outcome =
  | { readonly kind: 'ok'; readonly principal: AuthPrincipal }
  | { readonly kind: 'error'; readonly message: string };

/** Tagged with the subject it belongs to, so one user never sees another's. */
interface Fetched {
  readonly sub: string;
  readonly outcome: Outcome;
}

/**
 * Calls the protected `GET /api/me`.
 *
 * Proof that the full token path works: Auth0 issues an access token for the
 * VeriPay audience, the browser sends it as a bearer token, and the API
 * verifies it against Auth0's JWKS before answering.
 */
export function MePanel(): React.JSX.Element {
  const { isAuthenticated, user } = useAuth0();
  const client = useApiClient();
  const [fetched, setFetched] = useState<Fetched | undefined>(undefined);

  const sub = user?.sub;

  useEffect(() => {
    if (!isAuthenticated || sub === undefined) {
      return;
    }

    let active = true;

    // setState happens only in these async callbacks, never synchronously in
    // the effect body — a synchronous call there would cascade renders.
    client
      .getMe()
      .then((principal) => {
        if (active) setFetched({ sub, outcome: { kind: 'ok', principal } });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFetched({
          sub,
          outcome: {
            kind: 'error',
            message: isAppError(error) ? error.message : 'Unexpected error calling /api/me',
          },
        });
      });

    return () => {
      active = false;
    };
  }, [client, isAuthenticated, sub]);

  if (!isAuthenticated || sub === undefined) {
    return <p className="app__hint">Sign in to see the verified token principal.</p>;
  }

  // Derived during render rather than stored: a result belonging to a previous
  // session is simply not current, so it can never be displayed.
  const outcome = fetched?.sub === sub ? fetched.outcome : undefined;

  if (outcome === undefined) {
    return <p className="status status--pending">Verifying with the API…</p>;
  }

  if (outcome.kind === 'error') {
    return (
      <div className="status status--error" role="alert">
        <p>/api/me failed</p>
        <p className="status__detail">{outcome.message}</p>
      </div>
    );
  }

  return (
    <dl className="status status--ok">
      <div>
        <dt>Verified sub</dt>
        <dd>
          <code>{outcome.principal.sub}</code>
        </dd>
      </div>
      <div>
        <dt>Scope</dt>
        <dd>{outcome.principal.scope.length > 0 ? outcome.principal.scope.join(' ') : '—'}</dd>
      </div>
    </dl>
  );
}
