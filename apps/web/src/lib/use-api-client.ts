import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';

import { browserEnv, resolveAuth0Settings } from '../env.js';
import { type ApiClient, createApiClient } from './api-client.js';

/**
 * An API client wired to the current Auth0 session.
 *
 * The token provider asks Auth0 for an access token scoped to the VeriPay API
 * audience. Requesting the audience is what makes Auth0 mint a real JWT access
 * token rather than an opaque one the API could not verify.
 *
 * Memoised on the auth state so it is referentially stable across renders —
 * components pass it to effects, and a fresh object each render would loop.
 */
export function useApiClient(): ApiClient {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const auth0 = resolveAuth0Settings();

  return useMemo(
    () =>
      createApiClient({
        baseUrl: browserEnv.VITE_API_BASE_URL,
        getAccessToken: async () => {
          if (!isAuthenticated || auth0 === undefined) {
            return undefined;
          }
          return getAccessTokenSilently({
            authorizationParams: { audience: auth0.audience },
          });
        },
      }),
    [getAccessTokenSilently, isAuthenticated, auth0],
  );
}
