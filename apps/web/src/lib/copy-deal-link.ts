export const SAMPLE_DEAL_LINK_DISPLAY = 'veripay.co/d/a7f3-9x2k-onetime';
export const SAMPLE_DEAL_LINK = `https://${SAMPLE_DEAL_LINK_DISPLAY}`;

export async function copyDealLink(link = SAMPLE_DEAL_LINK): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}
