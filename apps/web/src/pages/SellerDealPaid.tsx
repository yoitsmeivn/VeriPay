import { Button, Card, Chip, Typography } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar.js';

const STEPPER = [
  { label: 'Accepted', sub: 'Jun 14' },
  { label: 'Funded', sub: 'Jun 14' },
  { label: 'Delivered', sub: 'Jun 15' },
  { label: 'Confirmed', sub: 'Jun 15' },
  { label: 'Paid out', sub: 'Just now' },
];

export function SellerDealPaid(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex flex-1 justify-center px-14 pb-14 pt-10">
        <div className="flex w-full max-w-[600px] flex-col items-center gap-6 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-success-soft">
            <Icon icon="solar:check-circle-bold" width={32} className="text-[#5fc43e]" />
          </div>

          <div>
            <Typography type="h3" className="text-[30px] font-semibold tracking-[-0.02em]">
              You&rsquo;ve been paid.
            </Typography>
            <p className="mt-2 text-[15px] text-muted">
              Alex T. confirmed receipt of the 2× Coachella GA Wristbands. Your funds have been released and
              are on the way.
            </p>
          </div>

          {/* payout */}
          <Card className="flex w-full items-center justify-between gap-4 p-7 text-left">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted">Payout</p>
              <span className="text-[34px] font-semibold tracking-[-0.02em]">$740.00</span>
              <div className="flex items-center gap-2 text-[14px] font-medium text-muted">
                <Icon icon="solar:card-linear" width={18} className="text-accent" />
                Chase ••4589 · arriving Jun 17 (1–2 business days)
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Chip color="success" variant="soft" size="sm">
                On the way
              </Chip>
              <span className="text-[12px] font-medium text-muted">via Stripe Connect</span>
            </div>
          </Card>

          {/* stepper */}
          <Card className="flex w-full items-start justify-between p-6">
            {STEPPER.map((step) => (
              <div key={step.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Icon icon="solar:check-bold" width={12} />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold">{step.label}</p>
                  <p className="text-[11px] text-muted">{step.sub}</p>
                </div>
              </div>
            ))}
          </Card>

          <Button variant="outline" onPress={() => navigate('/')}>
            Back to dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
