import {
  Button,
  Card,
  Chip,
  Input,
  Separator,
  TextArea,
  toast,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar.js';
import { TrustPanel } from '../components/TrustPanel.js';
import { copyDealLink } from '../lib/copy-deal-link.js';

type Side = 'buyer' | 'seller';
type Status = 'new' | 'connected' | 'held' | 'completed';
type StepState = 'done' | 'current' | 'pending';

const STATUS_META: Record<Status, { label: string; color: 'default' | 'accent' | 'success' }> = {
  new: { label: 'New', color: 'default' },
  connected: { label: 'Connected', color: 'accent' },
  held: { label: 'Held', color: 'accent' },
  completed: { label: 'Completed', color: 'success' },
};

const CURRENT_INDEX: Record<Status, number> = { new: 0, connected: 1, held: 2, completed: 5 };

const SELLER_STEPS = [
  { title: 'Buyer accepted the deal', sub: 'Jun 14 · alex.tran@email.com' },
  { title: 'Buyer funded the payment', sub: 'Jun 14 · $740.00 held by Stripe' },
  { title: 'Deliver the item', sub: 'Send it, then mark as delivered' },
  { title: 'Buyer confirms receipt', sub: 'Releases the funds to you' },
  { title: 'Funds released to your bank', sub: 'Auto-releases in 47h 12m if no action' },
];

const BUYER_STEPS = [
  { title: 'You accepted the deal', sub: 'Jun 14 · you@email.com' },
  { title: 'You funded the payment', sub: 'Jun 14 · $740.00 held by Stripe' },
  { title: 'Seller delivers the item', sub: 'You’ll be notified when it’s sent' },
  { title: 'Confirm you received it', sub: 'Releases the payment to the seller' },
  { title: 'Payment released to the seller', sub: 'Auto-releases in 47h 12m if no action' },
];

function stepStateFor(index: number, current: number): StepState {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'pending';
}

function TimelineStep({
  title,
  sub,
  state,
  isLast,
}: {
  title: string;
  sub: string;
  state: StepState;
  isLast: boolean;
}): React.JSX.Element {
  return (
    <div className="flex gap-3.5">
      <div className="flex flex-col items-center">
        {state === 'done' ? (
          <div className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
            <Icon icon="solar:check-bold" width={12} />
          </div>
        ) : state === 'current' ? (
          <div className="grid size-6 place-items-center rounded-full border-2 border-accent bg-accent-soft">
            <div className="size-2 rounded-full bg-accent" />
          </div>
        ) : (
          <div className="size-6 rounded-full bg-black/[0.06]" />
        )}
        {isLast ? null : (
          <div className={`mt-1 w-0.5 flex-1 ${state === 'done' ? 'bg-accent' : 'bg-border'}`} />
        )}
      </div>
      <div className={isLast ? 'pb-4' : 'pb-5'}>
        <p
          className={`text-[15px] ${state === 'pending' ? 'font-medium text-muted' : 'font-semibold text-foreground'}`}
        >
          {title}
        </p>
        <p className="text-[13px] text-muted">{sub}</p>
      </div>
    </div>
  );
}

const PAYOUT_STEPS = [
  { label: 'Accepted', sub: 'Jun 14' },
  { label: 'Funded', sub: 'Jun 14' },
  { label: 'Delivered', sub: 'Jun 15' },
  { label: 'Confirmed', sub: 'Jun 15' },
  { label: 'Paid out', sub: 'Now' },
];

export function DealDetail(): React.JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const side: Side = params.get('as') === 'buyer' ? 'buyer' : 'seller';
  const statusParam = params.get('status') as Status | null;
  const status: Status = statusParam && statusParam in STATUS_META ? statusParam : 'held';

  const isSeller = side === 'seller';
  const steps = isSeller ? SELLER_STEPS : BUYER_STEPS;
  const current = CURRENT_INDEX[status];
  const meta = STATUS_META[status];

  const go = (s: Status): string => `/deal?as=${side}&status=${s}`;

  async function handleCopy(): Promise<void> {
    const copied = await copyDealLink();
    toast[copied ? 'success' : 'danger'](copied ? 'One-time link copied' : 'Could not copy link', {
      description: copied ? 'Share it once before it expires.' : 'Try again from the deal.',
    });
  }

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
              <Chip color={meta.color} variant="soft" size="sm">
                {meta.label}
              </Chip>
              <Chip variant="tertiary" size="sm">
                <Icon icon={isSeller ? 'solar:tag-linear' : 'solar:cart-large-2-linear'} width={13} />
                {isSeller ? 'Seller' : 'Buyer'}
              </Chip>
            </div>
            <p className="mt-1.5 text-[14px] text-muted">
              You&rsquo;re {isSeller ? 'selling' : 'buying'} · Deal #A7F3
            </p>
          </div>
          <span className="text-[30px] font-semibold tracking-[-0.02em]">$740.00</span>
        </div>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            {status === 'completed' ? (
              <CompletedCards isSeller={isSeller} />
            ) : (
              <>
                <Card className="flex flex-col gap-1 p-7">
                  <p className="mb-2 text-[16px] font-semibold tracking-[-0.01em]">Deal timeline</p>
                  {steps.map((step, i) => (
                    <TimelineStep
                      key={step.title}
                      title={step.title}
                      sub={step.sub}
                      state={stepStateFor(i, current)}
                      isLast={i === steps.length - 1}
                    />
                  ))}
                </Card>

                <ActionCard
                  status={status}
                  isSeller={isSeller}
                  onDeliver={() => navigate(go('completed'))}
                  onConfirm={() => {
                    toast.success('Receipt confirmed', { description: 'Releasing the payment to the seller.' });
                    navigate(go('completed'));
                  }}
                  onFund={() =>
                    toast.success('Redirecting to secure payment', {
                      description: 'You’ll complete the payment with Stripe.',
                    })
                  }
                  onCopy={() => void handleCopy()}
                />
              </>
            )}
          </div>

          {isSeller ? (
            <TrustPanel
              name="Alex T."
              email="alex.tran@email.com"
              score={88}
              riskLabel="Low risk"
              badge="Trusted buyer"
            />
          ) : (
            <TrustPanel
              name="Jordan M."
              email="jordan.m@email.com"
              score={92}
              riskLabel="Low risk"
              badge="Trusted seller"
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ActionCard({
  status,
  isSeller,
  onDeliver,
  onConfirm,
  onFund,
  onCopy,
}: {
  status: Status;
  isSeller: boolean;
  onDeliver: () => void;
  onConfirm: () => void;
  onFund: () => void;
  onCopy: () => void;
}): React.JSX.Element {
  if (status === 'new') {
    return (
      <Card className="flex flex-col gap-4 p-7">
        <div>
          <p className="text-[16px] font-semibold tracking-[-0.01em]">Share the deal</p>
          <p className="mt-1 text-[14px] text-muted">
            Waiting for the other party to open your one-time link and accept. Nothing happens until they
            do.
          </p>
        </div>
        <Button variant="outline" className="w-full" onPress={onCopy}>
          <Icon icon="solar:copy-linear" width={16} />
          Copy one-time link
        </Button>
      </Card>
    );
  }

  if (status === 'connected') {
    return isSeller ? (
      <Card className="flex items-start gap-3 p-7">
        <Icon icon="solar:hourglass-line-linear" width={20} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <p className="text-[16px] font-semibold tracking-[-0.01em]">Waiting on the buyer</p>
          <p className="mt-1 text-[14px] text-muted">
            The buyer accepted. Waiting for them to fund the payment before you deliver.
          </p>
        </div>
      </Card>
    ) : (
      <Card className="flex flex-col gap-4 p-7">
        <div>
          <p className="text-[16px] font-semibold tracking-[-0.01em]">Fund the payment</p>
          <p className="mt-1 text-[14px] text-muted">
            Your $740.00 is held by Stripe and only released to the seller once you confirm receipt — or
            after 48 hours.
          </p>
        </div>
        <Button className="w-full" onPress={onFund}>
          <Icon icon="solar:lock-keyhole-minimalistic-linear" width={16} />
          Fund the payment securely
        </Button>
      </Card>
    );
  }

  // held
  return isSeller ? (
    <DeliverCard onDeliver={onDeliver} />
  ) : (
    <Card className="flex flex-col gap-4 p-7">
      <div>
        <p className="text-[16px] font-semibold tracking-[-0.01em]">Confirm you received it</p>
        <p className="mt-1 text-[14px] text-muted">
          Jordan M. marked this as delivered. Confirm you have the item as described to release the payment.
        </p>
      </div>
      <div className="rounded-xl bg-background-secondary px-4 py-3">
        <p className="text-[13px] font-semibold">Seller’s delivery note</p>
        <p className="mt-1 text-[13px] text-muted">
          Transferred both wristbands via official AXS. You should see them under “My Events”.
        </p>
      </div>
      <Button className="w-full" onPress={onConfirm}>
        <Icon icon="solar:check-circle-linear" width={16} />
        Confirm receipt &amp; release funds
      </Button>
    </Card>
  );
}

function DeliverCard({ onDeliver }: { onDeliver: () => void }): React.JSX.Element {
  const [method, setMethod] = useState<'link' | 'note'>('link');

  return (
    <Card className="flex flex-col gap-4 p-7">
      <div>
        <p className="text-[16px] font-semibold tracking-[-0.01em]">Deliver the item</p>
        <p className="mt-1 text-[14px] text-muted">
          Delivered in the app? Send a secure link. Handled it in person or on another platform? Just add a
          note.
        </p>
      </div>

      <ToggleButtonGroup
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[method]}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next === 'link' || next === 'note') setMethod(next);
        }}
      >
        <ToggleButton id="link" className="flex-1">
          <Icon icon="solar:link-linear" width={16} />
          Send a link
        </ToggleButton>
        <ToggleButton id="note" className="flex-1">
          <Icon icon="solar:notes-linear" width={16} />
          Add a note
        </ToggleButton>
      </ToggleButtonGroup>

      {method === 'link' ? (
        <>
          <Input placeholder="Paste the delivery link — AXS transfer, Drive file, tracking #…" />
          <p className="text-[13px] text-muted">
            The buyer gets it instantly in-app and by email. We log the handoff for both of you.
          </p>
        </>
      ) : (
        <>
          <TextArea
            className="h-24 w-full"
            placeholder="Describe how you delivered it — e.g. handed off in person at the venue, or sent via AXS to their email…"
          />
          <p className="text-[13px] text-muted">
            Use this when the handoff happened in person or on another platform. Your note is shared with
            the buyer.
          </p>
        </>
      )}

      <Button className="w-full" onPress={onDeliver}>
        {method === 'link' ? 'Send link' : 'Save note'} &amp; mark delivered
      </Button>
    </Card>
  );
}

function CompletedCards({ isSeller }: { isSeller: boolean }): React.JSX.Element {
  if (isSeller) {
    return (
      <>
        <Card className="flex items-center gap-4 p-7">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-success-soft">
            <Icon icon="solar:check-circle-bold" width={30} className="text-[#5fc43e]" />
          </div>
          <div>
            <p className="text-[18px] font-semibold tracking-[-0.01em]">You&rsquo;ve been paid.</p>
            <p className="mt-0.5 text-[14px] text-muted">
              Alex T. confirmed receipt. Your funds have been released and are on the way.
            </p>
          </div>
        </Card>

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
            {PAYOUT_STEPS.map((step) => (
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
      </>
    );
  }

  return (
    <>
      <Card className="flex items-center gap-4 p-7">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-success-soft">
          <Icon icon="solar:check-circle-bold" width={30} className="text-[#5fc43e]" />
        </div>
        <div>
          <p className="text-[18px] font-semibold tracking-[-0.01em]">All done.</p>
          <p className="mt-0.5 text-[14px] text-muted">
            You confirmed receipt of the 2× Coachella GA Wristbands. The payment has been released to Jordan
            M.
          </p>
        </div>
      </Card>

      <Card className="flex items-center justify-between p-7">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-accent-soft">
            <Icon icon="solar:ticket-linear" width={18} className="text-accent" />
          </div>
          <div>
            <p className="text-[15px] font-semibold">2× Coachella GA Wristbands</p>
            <p className="text-[12px] font-medium text-muted">Received · Jun 15 · from Jordan M.</p>
          </div>
        </div>
        <span className="text-[18px] font-semibold">$740.00</span>
      </Card>
    </>
  );
}
