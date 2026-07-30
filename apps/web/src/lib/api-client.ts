import {
  type AuthPrincipal,
  type HealthPayload,
  AppError,
  InternalError,
  UnauthenticatedError,
  UpstreamUnavailableError,
  ValidationError,
  apiFailureSchema,
  healthResponseSchema,
  meResponseSchema,
} from '@veripay/shared';

export interface ApiClientOptions {
  readonly baseUrl: string;
  /** Injected so tests can drive the client without a network. */
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
  /**
   * Supplies an Auth0 access token for protected routes.
   *
   * Resolve to `undefined` when nobody is signed in — the request then goes out
   * unauthenticated and the API answers 401, which is the correct outcome.
   */
  readonly getAccessToken?: () => Promise<string | undefined>;
}

export interface ApiClient {
  /** Public route. Never sends an Authorization header. */
  getHealth(): Promise<HealthPayload>;
  /** Protected route. Requires a configured token provider. */
  getMe(): Promise<AuthPrincipal>;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Typed HTTP client for the VeriPay API.
 *
 * Every response is parsed with the shared schema, so a contract change shows
 * up here as a `ValidationError` instead of an undefined property deep in a
 * component. Failures always surface as `AppError` subclasses.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const { getAccessToken } = options;

  async function requestJson(path: string, options: { authenticated: boolean }): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (options.authenticated) {
      let token: string | undefined;
      try {
        token = await getAccessToken?.();
      } catch (error) {
        // A failed silent-token refresh means the session is gone, not that the
        // API is broken. Surface it as an auth failure the UI can act on.
        throw new UnauthenticatedError('Could not obtain an access token', { cause: error });
      }
      if (token !== undefined && token !== '') {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers,
        // Auth is bearer-token based, so the browser never needs to attach
        // cookies. This matches the API's `credentials: false` CORS policy.
        credentials: 'omit',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new UpstreamUnavailableError('Could not reach the VeriPay API', { cause: error });
    }

    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const failure = apiFailureSchema.safeParse(body);
      if (failure.success) {
        throw new AppError(failure.data.error.code, failure.data.error.message, {
          details: failure.data.error.details,
        });
      }
      throw new InternalError(`API request failed with status ${String(response.status)}`);
    }

    return body;
  }

  return {
    async getHealth(): Promise<HealthPayload> {
      const body = await requestJson('/api/health', { authenticated: false });
      const parsed = healthResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError('Unexpected health response shape', {
          details: parsed.error.issues,
          cause: parsed.error,
        });
      }
      return parsed.data.data;
    },

    async getMe(): Promise<AuthPrincipal> {
      const body = await requestJson('/api/me', { authenticated: true });
      const parsed = meResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError('Unexpected /api/me response shape', {
          details: parsed.error.issues,
          cause: parsed.error,
        });
      }
      return parsed.data.data;
    },
  };
}
