import { isAppError } from '@veripay/shared';
import { toast } from '@heroui/react';
import { useCallback, useState } from 'react';

import { useApiClient } from './use-api-client.js';

export interface UseFundDealResult {
  readonly fundDeal: (dealRef: string) => Promise<void>;
  readonly isFunding: boolean;
}

/**
 * Creates a Stripe Checkout session and redirects the buyer to fund a deal.
 */
export function useFundDeal(): UseFundDealResult {
  const api = useApiClient();
  const [isFunding, setIsFunding] = useState(false);

  const fundDeal = useCallback(
    async (dealRef: string): Promise<void> => {
      if (isFunding) {
        return;
      }

      setIsFunding(true);
      try {
        const { checkoutUrl } = await api.fundDeal(dealRef);
        window.location.assign(checkoutUrl);
      } catch (error) {
        setIsFunding(false);
        if (isAppError(error)) {
          toast.danger('Could not start payment', { description: error.message });
          return;
        }
        toast.danger('Could not start payment', {
          description: 'Try again in a moment.',
        });
      }
    },
    [api, isFunding],
  );

  return { fundDeal, isFunding };
}
