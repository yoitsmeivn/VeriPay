import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';

import { createShutdownCoordinator } from './shutdown.js';

function silentLogger() {
  return pino({ level: 'silent' });
}

describe('createShutdownCoordinator', () => {
  it('runs cleanup tasks in registration order and awaits each one', async () => {
    const order: string[] = [];
    const coordinator = createShutdownCoordinator({
      logger: silentLogger(),
      graceMs: 1000,
      terminate: () => undefined,
    });

    coordinator.register('slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push('slow');
    });
    coordinator.register('fast', () => {
      order.push('fast');
    });

    await coordinator.shutdown('SIGTERM');

    // 'slow' finished before 'fast' started, proving each task is awaited.
    expect(order).toEqual(['slow', 'fast']);
  });

  it('ignores a second shutdown while one is in progress', async () => {
    const task = vi.fn();
    const coordinator = createShutdownCoordinator({
      logger: silentLogger(),
      graceMs: 1000,
      terminate: () => undefined,
    });
    coordinator.register('cleanup', task);

    const first = coordinator.shutdown('SIGTERM');
    const second = coordinator.shutdown('SIGINT');
    await Promise.all([first, second]);

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('reports isShuttingDown once started', async () => {
    const coordinator = createShutdownCoordinator({
      logger: silentLogger(),
      graceMs: 1000,
      terminate: () => undefined,
    });
    expect(coordinator.isShuttingDown).toBe(false);
    const done = coordinator.shutdown('SIGTERM');
    expect(coordinator.isShuttingDown).toBe(true);
    await done;
  });

  it('continues past a failing task and records a non-zero exit code', async () => {
    const after = vi.fn();
    const previousExitCode = process.exitCode;
    const coordinator = createShutdownCoordinator({
      logger: silentLogger(),
      graceMs: 1000,
      terminate: () => undefined,
    });

    coordinator.register('broken', () => {
      throw new Error('cleanup exploded');
    });
    coordinator.register('after', after);

    await coordinator.shutdown('SIGTERM');

    expect(after).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });

  it('does not terminate before cleanup has had its chance to run', async () => {
    const terminate = vi.fn();
    const coordinator = createShutdownCoordinator({
      logger: silentLogger(),
      graceMs: 5000,
      terminate,
    });

    let taskFinished = false;
    coordinator.register('cleanup', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      // The forced path must not have fired while this was still running.
      expect(terminate).not.toHaveBeenCalled();
      taskFinished = true;
    });

    await coordinator.shutdown('SIGTERM');

    expect(taskFinished).toBe(true);
    expect(terminate).not.toHaveBeenCalled();
  });

  it('forces termination only after the grace period elapses', async () => {
    vi.useFakeTimers();
    const terminate = vi.fn();
    const previousExitCode = process.exitCode;

    const coordinator = createShutdownCoordinator({
      logger: silentLogger(),
      graceMs: 50,
      terminate,
    });

    // A task that never settles is exactly what the grace period exists for.
    coordinator.register('hangs', () => new Promise<void>(() => undefined));
    void coordinator.shutdown('SIGTERM');

    await vi.advanceTimersByTimeAsync(49);
    expect(terminate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2);
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);

    process.exitCode = previousExitCode;
    vi.useRealTimers();
  });
});
