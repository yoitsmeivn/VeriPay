import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AuthLoadingScreen } from './auth-loading-screen.js';

/**
 * Protects registered-user routes. Unauthenticated visitors are sent to Auth0
 * Universal Login automatically; after success they return to the route they
 * requested (default `/` dashboard).
 *
 * Guest flows (`/invite`, `/confirm`) must stay outside this layout — those
 * recipients never sign in to Auth0.
 */
export function RequireAuth(): React.JSX.Element {
  const { isLoading, isAuthenticated, error, loginWithRedirect } = useAuth0();
  const location = useLocation();
  const loginStarted = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || error !== undefined || loginStarted.current) {
      return;
    }

    loginStarted.current = true;
    void loginWithRedirect({
      appState: { returnTo: location.pathname + location.search },
    });
  }, [isLoading, isAuthenticated, error, loginWithRedirect, location.pathname, location.search]);

  if (error !== undefined) {
    return (
      <AuthLoadingScreen
        variant="error"
        detail={error.message}
        onRetry={() => {
          loginStarted.current = false;
          void loginWithRedirect({ appState: { returnTo: '/' } });
        }}
      />
    );
  }

  if (isLoading || !isAuthenticated) {
    return <AuthLoadingScreen variant="loading" />;
  }

  return <Outlet />;
}
