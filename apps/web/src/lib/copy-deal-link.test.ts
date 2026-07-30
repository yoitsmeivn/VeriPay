import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyDealLink, SAMPLE_DEAL_LINK } from './copy-deal-link.js';

describe('copyDealLink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the deal link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyDealLink()).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(SAMPLE_DEAL_LINK);
  });

  it('returns false when clipboard access fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyDealLink()).resolves.toBe(false);
  });
});
