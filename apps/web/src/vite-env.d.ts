/// <reference types="vite/client" />

/**
 * Typed browser environment.
 *
 * Only VITE_-prefixed variables reach the bundle. Anything added here must
 * also be added to .env.example, and must never be a secret — everything in
 * this interface ships to the browser in plain text.
 *
 * Note what is absent: there is no browser-side Auth0 client-secret entry. An
 * SPA is a public client; the Auth0 client secret stays server-side and is
 * never mirrored here.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH0_DOMAIN?: string;
  readonly VITE_AUTH0_CLIENT_ID?: string;
  readonly VITE_AUTH0_AUDIENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
