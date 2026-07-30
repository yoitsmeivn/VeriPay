import { Avatar, Button, Card, Separator, toast, Typography } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import { Logo } from '../components/Logo.js';

function PublicHeader({ context }: { context: string }): React.JSX.Element {
  return (
    <>
      <header className="flex items-center justify-between px-8 py-5">
        <Link to="/" className="text-foreground">
          <Logo className="h-5 w-auto" />
        </Link>
        <div className="flex items-center gap-1.5 text-muted">
          <Icon icon="solar:lock-keyhole-minimalistic-linear" width={15} />
          <span className="text-[14px] font-medium">{context}</span>
        </div>
      </header>
      <div className="h-px w-full bg-border" />
    </>
  );
}

export function BuyerConfirm(): React.JSX.Element {
  const navigate = useNavigate();

  function handleConfirm(): void {
    toast.success('Receipt confirmed', {
      description: 'Funds are being released to Jordan M.',
    });
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader context="Deal #A7F3" />

      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-5 px-6 pb-20 pt-14">
        <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-accent">
          Seller marked as delivered
        </p>
        <Typography type="h3" className="text-center text-[38px] font-semibold tracking-[-0.02em]">
          Did you receive your order?
        </Typography>
        <p className="text-center text-[15px] text-muted">
          Jordan M. marked this deal as delivered. Confirm you&rsquo;ve got it to release the $740.00 held
          by Stripe.
        </p>

        <Card className="flex w-full flex-col gap-3 p-7">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold">Seller&rsquo;s delivery note</p>
            <span className="text-[12px] font-medium text-muted">Jun 15, 3:42pm</span>
          </div>
          <p className="text-[14px] text-muted">
            Transferred both wristbands via official AXS to alex.tran@email.com. You should see them under
            &ldquo;My Events&rdquo;. Let me know if anything&rsquo;s off!
          </p>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <Avatar.Fallback className="bg-accent-soft text-accent">
                  <Icon icon="solar:ticket-linear" width={18} />
                </Avatar.Fallback>
              </Avatar>
              <div>
                <p className="text-[15px] font-semibold">2× Coachella GA Wristbands</p>
                <p className="text-[12px] font-medium text-muted">from Jordan M.</p>
              </div>
            </div>
            <span className="text-[18px] font-semibold">$740.00</span>
          </div>
        </Card>

        <Button className="w-full" onPress={handleConfirm}>
          <Icon icon="solar:check-circle-linear" width={18} />
          Confirm receipt &amp; release funds
        </Button>
        <Button variant="danger-soft" className="w-full" onPress={() => navigate('/')}>
          Something&rsquo;s wrong — open a dispute
        </Button>
        <p className="text-center text-[13px] text-muted">
          Only confirm once you have the item as described. If you don&rsquo;t respond, funds release to
          the seller in 47h 12m.
        </p>
      </div>
    </div>
  );
}
