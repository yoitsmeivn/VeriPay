import { Auth0Provider } from '@auth0/auth0-react';
import { Toast } from '@heroui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App.js';
import { resolveAuth0Settings } from './env.js';
import './styles.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root container #root is missing from index.html');
}

const auth0 = resolveAuth0Settings();

// The routed application, mounted exactly once. The router and the toast
// provider live here rather than inside either branch below, so that
// configuring Auth0 cannot silently duplicate them.
const application = (
  <BrowserRouter>
    <Toast.Provider placement="bottom end" />
    <App />
  </BrowserRouter>
);

// When Auth0 is not configured the provider is skipped entirely rather than
// mounted with empty strings, which would point sign-in at a broken tenant.
// This keeps `npm run build` and the test suite working on a checkout with no
// Auth0 values; the UI renders exactly as before, just without a session.
const tree =
  auth0 === undefined ? (
    application
  ) : (
    <Auth0Provider
      domain={auth0.domain}
      clientId={auth0.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        // Required: without an audience Auth0 issues an opaque token the API
        // cannot verify. This must match the API identifier in the dashboard
        // and the API's AUTH0_AUDIENCE.
        audience: auth0.audience,
      }}
      // Tokens live in memory only; no refresh tokens in browser storage.
      cacheLocation="memory"
    >
      {application}
    </Auth0Provider>
  );

createRoot(container).render(<StrictMode>{tree}</StrictMode>);
