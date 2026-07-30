import { Chip } from '@heroui/react';
import { Icon } from '@iconify/react';

/** Buyer / Seller role tag — blue for buyer, green for seller. */
export function RoleTag({ side }: { side: 'Buyer' | 'Seller' }): React.JSX.Element {
  const isBuyer = side === 'Buyer';
  return (
    <Chip
      variant="soft"
      size="sm"
      className={isBuyer ? 'bg-[#e6effb] text-[#1d4ed8]' : 'bg-[#e4f3ea] text-[#0d6b3f]'}
    >
      <Icon icon={isBuyer ? 'solar:cart-large-2-linear' : 'solar:tag-linear'} width={13} />
      {side}
    </Chip>
  );
}
