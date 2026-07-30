import {
  Button,
  Card,
  Chip,
  Input,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar.js';
import { TrustPanel } from '../components/TrustPanel.js';

type StepState = 'done' | 'current' | 'pending';

const STEPS: { title: string; sub: string; state: StepState }[] = [
  { title: 'Buyer accepted the deal', sub: 'Jun 14 · alex.tran@email.com', state: 'done' },
  { title: 'Buyer funded the payment', sub: 'Jun 14 · $740.00 held by Stripe', state: 'done' },
  { title: 'Deliver the item', sub: 'Send it, then mark as delivered below', state: 'current' },
  { title: 'Buyer confirms receipt', sub: 'Releases the funds to you', state: 'pending' },
  { title: 'Funds released to your bank', sub: 'Auto-releases in 47h 12m if no action', state: 'pending' },
];

function TimelineStep({
  step,
  isLast,
}: {
  step: { title: string; sub: string; state: StepState };
  isLast: boolean;
}): React.JSX.Element {
  return (
    <div className="flex gap-3.5">
      <div className="flex flex-col items-center">
        {step.state === 'done' ? (
          <div className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
            <Icon icon="solar:check-bold" width={12} />
          </div>
        ) : step.state === 'current' ? (
          <div className="grid size-6 place-items-center rounded-full border-2 border-accent bg-accent-soft">
            <div className="size-2 rounded-full bg-accent" />
          </div>
        ) : (
          <div className="size-6 rounded-full bg-black/[0.06]" />
        )}
        {isLast ? null : (
          <div className={`mt-1 w-0.5 flex-1 ${step.state === 'done' ? 'bg-accent' : 'bg-border'}`} />
        )}
      </div>
      <div className={`pb-4 ${isLast ? '' : 'pb-5'}`}>
        <p
          className={`text-[15px] ${step.state === 'pending' ? 'font-medium text-muted' : 'font-semibold text-foreground'}`}
        >
          {step.title}
        </p>
        <p className="text-[13px] text-muted">{step.sub}</p>
      </div>
    </div>
  );
}

export function SellerDeal(): React.JSX.Element {
  const navigate = useNavigate();

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
              <Chip color="accent" variant="soft" size="sm">
                Held
              </Chip>
            </div>
            <p className="mt-1.5 text-[14px] text-muted">
              You&rsquo;re selling · Deal #A7F3 · Buyer funded Jun 14
            </p>
          </div>
          <span className="text-[30px] font-semibold tracking-[-0.02em]">$740.00</span>
        </div>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            <Card className="flex flex-col gap-1 p-7">
              <p className="mb-2 text-[16px] font-semibold tracking-[-0.01em]">Deal timeline</p>
              {STEPS.map((step, i) => (
                <TimelineStep key={step.title} step={step} isLast={i === STEPS.length - 1} />
              ))}
            </Card>

            <Card className="flex flex-col gap-4 p-7">
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.01em]">Deliver the item</p>
                <p className="mt-1 text-[14px] text-muted">
                  Delivered in the app? Send a secure link. Handled it in person or on another platform?
                  Just add a note.
                </p>
              </div>

              <ToggleButtonGroup selectionMode="single" defaultSelectedKeys={['link']}>
                <ToggleButton id="link" className="flex-1">
                  <Icon icon="solar:link-linear" width={16} />
                  Send a link
                </ToggleButton>
                <ToggleButton id="note" className="flex-1">
                  <Icon icon="solar:notes-linear" width={16} />
                  Add a note
                </ToggleButton>
              </ToggleButtonGroup>

              <Input placeholder="Paste the delivery link — AXS transfer, Drive file, tracking #…" />
              <p className="text-[13px] text-muted">
                The buyer gets it instantly in-app and by email. We log the handoff for both of you.
              </p>

              <Button className="w-full" onPress={() => navigate('/deal/paid')}>
                Send link &amp; mark delivered
              </Button>
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
