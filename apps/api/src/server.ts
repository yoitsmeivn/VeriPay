/**
 * Process entrypoint.
 *
 * Owns everything the application factory deliberately does not: reading the
 * real environment, binding a socket, and shutting down cleanly.
 */

import { createApp } from './app.js';
import { createAuthenticatorFromEnv } from './auth/jwt.js';
import { EnvironmentError, loadEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createShutdownCoordinator } from './lib/shutdown.js';
import { parseStripeConfig } from './stripe/config.js';
import { createStripeGateway } from './stripe/gateway.js';

const SERVICE_VERSION = '0.1.0';

/** Node's defaults leave slow-header attacks more room than we need. */
const KEEP_ALIVE_TIMEOUT_MS = 65_000;
const HEADERS_TIMEOUT_MS = 66_000;
const REQUEST_TIMEOUT_MS = 30_000;

function main(): void {
  let env;
  try {
    env = loadEnv();
  } catch (error) {
    // No logger exists yet, and a misconfigured process must not start.
    if (error instanceof EnvironmentError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }

  const logger = createLogger(env);

  // Fails fast when AUTH0_DOMAIN / AUTH0_AUDIENCE are missing. Refusing to
  // start beats starting with an API whose protected routes cannot work.
  let authenticator;
  try {
    authenticator = createAuthenticatorFromEnv(env);
  } catch (error) {
    logger.fatal({ err: error }, 'cannot start without Auth0 configuration — see docs/auth0.md');
    process.exitCode = 1;
    return;
  }

  const stripe = buildStripeGateway(env, logger);

  const app = createApp({
    env,
    logger,
    authenticator,
    ...(stripe !== undefined ? { stripe } : {}),
    version: SERVICE_VERSION,
  });

  const server = app.listen(env.API_PORT, () => {
    logger.info(
      {
        port: env.API_PORT,
        baseUrl: env.API_BASE_URL,
        allowedOrigins: env.WEB_ORIGIN,
        version: SERVICE_VERSION,
      },
      'veripay-api listening',
    );
  });

  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;

  const shutdown = createShutdownCoordinator({ logger, graceMs: env.SHUTDOWN_GRACE_MS });

  // Cleanup for long-lived resources is registered here as they are added, for
  // example:
  //   shutdown.register('database', () => databaseClient.close());

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void shutdown.shutdown(signal, server);
    });
  }

  server.on('error', (error) => {
    logger.fatal({ err: error }, 'http server error');
    process.exitCode = 1;
    void shutdown.shutdown('server-error', server);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandled promise rejection');
    process.exitCode = 1;
    void shutdown.shutdown('unhandledRejection', server);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception');
    process.exitCode = 1;
    void shutdown.shutdown('uncaughtException', server);
  });
}

function buildStripeGateway(
  env: ReturnType<typeof loadEnv>,
  logger: ReturnType<typeof createLogger>,
): ReturnType<typeof createStripeGateway> | undefined {
  try {
    return createStripeGateway(parseStripeConfig(env));
  } catch (error) {
    if (error instanceof EnvironmentError) {
      logger.warn('Stripe not configured — fund and Connect routes return 502');
      return undefined;
    }
    throw error;
  }
}

main();
