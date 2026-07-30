/// <reference types="vite/client" />

/**
 * Typed browser environment.
 *
 * Only VITE_-prefixed variables reach the bundle. Anything added here must
 * also be added to .env.example, and must never be a secret — everything in
 * this interface ships to the browser in plain text.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
