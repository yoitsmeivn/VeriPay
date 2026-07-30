import { type Server } from 'node:http';

import { type Logger } from './logger.js';

export type CleanupTask = () => Promise<void> | void;

export interface ShutdownCoordinatorOptions {
  readonly logger: Logger;
  /**
   * How long the whole shutdown may take before the process is forced down.
   * The grace period covers the HTTP server close AND every cleanup task.
   */
  readonly graceMs: number;
  /** Injected so tests can observe termination without killing the runner. */
  readonly terminate?: () => void;
}

export interface ShutdownCoordinator {
  /** Registers cleanup to run after the HTTP server stops accepting requests. */
  register(name: string, task: CleanupTask): void;
  /** Runs the shutdown sequence. Safe to call more than once. */
  shutdown(reason: string, server?: Server): Promise<void>;
  readonly isShuttingDown: boolean;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
    // Keep-alive sockets would otherwise hold the server open for their full
    // idle timeout. In-flight requests are unaffected.
    server.closeIdleConnections();
  });
}

/**
 * Coordinates an orderly shutdown.
 *
 * Order: stop accepting connections -> await in-flight requests -> run every
 * cleanup task -> let the event loop drain.
 *
 * The process is never killed before the server and the cleanup tasks have had
 * their chance to finish. `process.exitCode` is set so Node exits naturally
 * once nothing is left pending; the hard timer only fires if something is
 * still hanging after the full grace period.
 */
export function createShutdownCoordinator(
  options: ShutdownCoordinatorOptions,
): ShutdownCoordinator {
  const { logger, graceMs } = options;
  const terminate = options.terminate ?? (() => process.exit(process.exitCode ?? 0));
  const tasks: { name: string; task: CleanupTask }[] = [];

  let shuttingDown = false;
  let inFlight: Promise<void> | undefined;

  async function run(reason: string, server?: Server): Promise<void> {
    logger.info({ reason, cleanupTasks: tasks.length }, 'shutdown started');

    // The hard deadline only decides *when to stop waiting*. It never
    // short-circuits the work below.
    const forceTimer = setTimeout(() => {
      logger.error(
        { reason, graceMs },
        'shutdown did not complete within the grace period, forcing exit',
      );
      process.exitCode = 1;
      terminate();
    }, graceMs);
    forceTimer.unref();

    try {
      if (server !== undefined) {
        await closeServer(server);
        logger.info('http server closed');
      }

      // Tasks run in registration order. One failure must not strand the rest,
      // so each is reported and the sequence continues.
      for (const { name, task } of tasks) {
        try {
          await task();
          logger.info({ task: name }, 'cleanup task complete');
        } catch (error) {
          logger.error({ err: error, task: name }, 'cleanup task failed');
          process.exitCode = 1;
        }
      }

      logger.info({ reason }, 'shutdown complete');
    } finally {
      clearTimeout(forceTimer);
    }
  }

  return {
    register(name, task) {
      tasks.push({ name, task });
    },

    shutdown(reason, server) {
      if (shuttingDown) {
        logger.warn({ reason }, 'shutdown already in progress, ignoring');
        return inFlight ?? Promise.resolve();
      }
      shuttingDown = true;
      inFlight = run(reason, server);
      return inFlight;
    },

    get isShuttingDown() {
      return shuttingDown;
    },
  };
}
