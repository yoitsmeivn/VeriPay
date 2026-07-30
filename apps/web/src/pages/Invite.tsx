import { Button, Card, Chip, Input, Label, Separator, TextField, toast, Typography } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

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

  function handleAccept(): void {
    toast.success('Deal accepted', {
      description: 'Next, fund the payment securely with Stripe.',
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
          Jordan M. wants to sell to you.
        </Typography>
        <p className="text-center text-[15px] text-muted">
          Review the terms and the seller below, then accept with your email. No account needed.
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
              <p className="text-[13px] font-medium text-muted">Total to pay</p>
              <p className="text-[13px] font-medium text-muted">You&rsquo;re the buyer</p>
            </div>
            <span className="text-[30px] font-semibold tracking-[-0.02em]">$740.00</span>
          </div>
        </Card>

        {/* seller trust */}
        <TrustPanel
          name="Jordan M."
          email="jordan.m@email.com"
          score={92}
          riskLabel="Low risk"
          badge="Trusted seller"
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
        <p className="text-center text-[13px] text-muted">
          By accepting, $740.00 will be held by Stripe and released to Jordan M. only when you confirm
          receipt — or automatically after 48 hours.
        </p>
      </div>
    </div>
  );
}
