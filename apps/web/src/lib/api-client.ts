import {
  type HealthPayload,
  AppError,
  InternalError,
  UpstreamUnavailableError,
  ValidationError,
  apiFailureSchema,
  healthResponseSchema,
} from '@veripay/shared';

export interface ApiClientOptions {
  readonly baseUrl: string;
  /** Injected so tests can drive the client without a network. */
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
}

export interface ApiClient {
  getHealth(): Promise<HealthPayload>;
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

  async function requestJson(path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
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
      const body = await requestJson('/api/health');
      const parsed = healthResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError('Unexpected health response shape', {
          details: parsed.error.issues,
          cause: parsed.error,
        });
      }
      return parsed.data.data;
    },
  };
}
