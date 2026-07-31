import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

import { type Auth0Settings } from '../env.js';

/**
 * Auth0 provider wired to React Router so post-login navigation lands on the
 * route the user originally requested (typically the dashboard at `/`).
 */
export function Auth0ProviderWithNavigate({
  settings,
  children,
}: {
  settings: Auth0Settings;
  children: React.ReactNode;
}): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <Auth0Provider
      domain={settings.domain}
      clientId={settings.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: settings.audience,
      }}
      cacheLocation="memory"
      onRedirectCallback={(appState?: AppState) => {
        navigate(appState?.returnTo ?? '/', { replace: true });
      }}
    >
      {children}
    </Auth0Provider>
  );
}
