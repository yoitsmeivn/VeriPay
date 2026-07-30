import {
  AppError,
  ERROR_CODES,
  InternalError,
  UpstreamUnavailableError,
  ValidationError,
} from '@veripay/shared';
import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from './api-client.js';

const BASE_URL = 'http://localhost:8787';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_HEALTH = {
  ok: true,
  data: {
    status: 'ok',
    service: 'veripay-api',
    version: '0.1.0',
    uptimeSeconds: 12,
    timestamp: '2026-07-30T12:00:00.000Z',
  },
};

describe('createApiClient.getHealth', () => {
  it('returns the parsed payload on success', async () => {
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse(VALID_HEALTH));
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchStub });

    await expect(client.getHealth()).resolves.toEqual(VALID_HEALTH.data);
  });

  it('calls the health endpoint without credentials', async () => {
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse(VALID_HEALTH));
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchStub });
    await client.getHealth();

    expect(fetchStub).toHaveBeenCalledWith(
      'http://localhost:8787/api/health',
      expect.objectContaining({ method: 'GET', credentials: 'omit' }),
    );
  });

  it('normalises a trailing slash on the base URL', async () => {
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse(VALID_HEALTH));
    const client = createApiClient({ baseUrl: `${BASE_URL}/`, fetch: fetchStub });
    await client.getHealth();

    expect(fetchStub.mock.calls[0]?.[0]).toBe('http://localhost:8787/api/health');
  });

  it('surfaces a typed API failure envelope as the matching AppError', async () => {
    // A Response body can only be read once, so build a fresh one per call.
    const fetchStub = vi.fn(() =>
      Promise.resolve(
        jsonResponse(
          {
            ok: false,
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: 'Route not found: GET /api/health',
              requestId: 'trace-1234',
            },
          },
          404,
        ),
      ),
    );
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchStub });

    const error = await client.getHealth().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      httpStatus: 404,
      message: 'Route not found: GET /api/health',
    });
  });

  it('falls back to an internal error when a failure body is unrecognisable', async () => {
    const fetchStub = vi.fn().mockResolvedValue(jsonResponse('<html>502</html>', 502));
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchStub });

    await expect(client.getHealth()).rejects.toBeInstanceOf(InternalError);
  });

  it('rejects a 200 whose payload does not match the contract', async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, data: { status: 'fine' } }));
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchStub });

    await expect(client.getHealth()).rejects.toBeInstanceOf(ValidationError);
  });

  it('reports an unreachable API as an upstream failure', async () => {
    const fetchStub = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchStub });

    await expect(client.getHealth()).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('treats a timeout as an upstream failure rather than hanging', async () => {
    const fetchStub = vi.fn().mockRejectedValue(new DOMException('Aborted', 'TimeoutError'));
    const client = createApiClient({ baseUrl: BASE_URL, fetch: fetchStub, timeoutMs: 1 });

    await expect(client.getHealth()).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});
