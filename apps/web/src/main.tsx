import { Toast } from '@heroui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App.js';
import { Auth0ProviderWithNavigate } from './components/auth0-provider-with-navigate.js';
import { resolveAuth0Settings } from './env.js';
import './styles.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root container #root is missing from index.html');
}

const auth0 = resolveAuth0Settings();

const app = <App />;

const routedApp = (
  <BrowserRouter>
    <Toast.Provider placement="bottom end" />
    {auth0 === undefined ? app : <Auth0ProviderWithNavigate settings={auth0}>{app}</Auth0ProviderWithNavigate>}
  </BrowserRouter>
);

createRoot(container).render(<StrictMode>{routedApp}</StrictMode>);
