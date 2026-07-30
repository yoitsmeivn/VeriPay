import { Button, Card, Chip, Input, Label, Separator, TextField, toast, Typography } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Logo } from '../components/Logo.js';
import { TrustPanel } from '../components/TrustPanel.js';

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

export function Invite(): React.JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // `as` is the recipient's role: seller accepting a buyer's deal, or buyer accepting a seller's deal.
  const asSeller = params.get('as') === 'seller';

  // The counterparty is always the deal's creator.
  const counterparty = asSeller
    ? { name: 'Alex T.', email: 'alex.tran@email.com', score: 88, badge: 'Trusted buyer', who: 'buyer' }
    : { name: 'Jordan M.', email: 'jordan.m@email.com', score: 92, badge: 'Trusted seller', who: 'seller' };

  const headline = asSeller ? 'Alex T. wants to buy from you.' : 'Jordan M. wants to sell to you.';
  const amountLabel = asSeller ? "Total you'll receive" : 'Total to pay';
  const roleLabel = asSeller ? "You're the seller" : "You're the buyer";
  const finePrint = asSeller
    ? 'By accepting, Alex T. funds the payment and Stripe holds it until you deliver and they confirm receipt — or it auto-releases to you after 48 hours.'
    : 'By accepting, $740.00 will be held by Stripe and released to Jordan M. only when you confirm receipt — or automatically after 48 hours.';

  function handleAccept(): void {
    toast.success('Deal accepted', {
      description: asSeller
        ? 'The buyer will be prompted to fund the payment.'
        : 'Next, fund the payment securely with Stripe.',
    });
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader context="Secure deal invite" />

      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-5 px-6 pb-20 pt-14">
        <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-accent">
          You&rsquo;ve been invited to a deal
        </p>
        <Typography type="h3" className="text-center text-[38px] font-semibold tracking-[-0.02em]">
          {headline}
        </Typography>
        <p className="text-center text-[15px] text-muted">
          Review the terms and the {counterparty.who} below, then accept with your email. No account
          needed.
        </p>

        {/* deal summary */}
        <Card className="flex w-full flex-col gap-4 p-7">
          <div className="flex items-center justify-between">
            <Chip variant="soft" color="default" size="sm">
              Awaiting your acceptance
            </Chip>
            <span className="text-[13px] font-medium text-muted">Deal #A7F3</span>
          </div>
          <p className="text-[22px] font-semibold tracking-[-0.01em]">2× Coachella GA Wristbands</p>
          <p className="text-[14px] text-muted">
            General admission weekend 1 wristbands, transferred via official AXS account. Sealed, never
            used.
          </p>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted">{amountLabel}</p>
              <p className="text-[13px] font-medium text-muted">{roleLabel}</p>
            </div>
            <span className="text-[30px] font-semibold tracking-[-0.02em]">$740.00</span>
          </div>
        </Card>

        {/* counterparty trust */}
        <TrustPanel
          name={counterparty.name}
          email={counterparty.email}
          score={counterparty.score}
          riskLabel="Low risk"
          badge={counterparty.badge}
        />

        {/* accept */}
        <TextField className="w-full">
          <Label>Your email</Label>
          <Input type="email" placeholder="you@email.com" />
        </TextField>
        <Button className="w-full" onPress={handleAccept}>
          Accept deal
          <Icon icon="solar:arrow-right-linear" width={18} />
        </Button>
        <p className="text-center text-[13px] text-muted">{finePrint}</p>
      </div>
    </div>
  );
}
