import { Card, Chip, Separator, Typography } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar.js';
import { TrustPanel } from '../components/TrustPanel.js';

const STEPPER = [
  { label: 'Accepted', sub: 'Jun 14' },
  { label: 'Funded', sub: 'Jun 14' },
  { label: 'Delivered', sub: 'Jun 15' },
  { label: 'Confirmed', sub: 'Jun 15' },
  { label: 'Paid out', sub: 'Just now' },
];

export function SellerDealPaid(): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 px-14 pb-14 pt-9">
        <Link to="/" className="text-[14px] font-medium text-muted hover:text-foreground">
          ← Back to deals
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Typography type="h3" className="text-[26px] font-semibold tracking-[-0.02em]">
                2× Coachella GA Wristbands
              </Typography>
              <Chip color="success" variant="soft" size="sm">
                Completed
              </Chip>
              <Chip variant="tertiary" size="sm">
                <Icon icon="solar:tag-linear" width={13} />
                Seller
              </Chip>
            </div>
            <p className="mt-1.5 text-[14px] text-muted">
              You&rsquo;re selling · Deal #A7F3 · Paid out just now
            </p>
          </div>
          <span className="text-[30px] font-semibold tracking-[-0.02em]">$740.00</span>
        </div>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            {/* You've been paid */}
            <Card className="flex items-center gap-4 p-7">
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-success-soft">
                <Icon icon="solar:check-circle-bold" width={30} className="text-[#5fc43e]" />
              </div>
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.01em]">You&rsquo;ve been paid.</p>
                <p className="mt-0.5 text-[14px] text-muted">
                  Alex T. confirmed receipt of the 2× Coachella GA Wristbands. Your funds have been
                  released and are on the way.
                </p>
              </div>
            </Card>

            {/* Payout */}
            <Card className="flex flex-col gap-5 p-7">
              <div className="flex items-start justify-between gap-4">
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
              </div>

              <Separator />

              <div className="flex items-start justify-between">
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
              </div>
            </Card>
          </div>

          <TrustPanel
            name="Alex T."
            email="alex.tran@email.com"
            score={88}
            riskLabel="Low risk"
            badge="Trusted buyer"
          />
        </div>
      </main>
    </div>
  );
}
