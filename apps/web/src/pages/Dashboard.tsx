import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar.js';

type Tone = 'neutral' | 'accent' | 'success' | 'warning';

const TONE: Record<Tone, { dot: string; soft: string; text: string }> = {
  neutral: { dot: 'bg-muted', soft: 'bg-black/[0.06]', text: 'text-muted' },
  accent: { dot: 'bg-accent', soft: 'bg-accent-soft', text: 'text-accent' },
  success: { dot: 'bg-success', soft: 'bg-success-soft', text: 'text-[#417435]' },
  warning: { dot: 'bg-warning', soft: 'bg-warning-soft', text: 'text-[#8a5b34]' },
};

function Pill({ label, tone, dot = true }: { label: string; tone: Tone; dot?: boolean }): React.JSX.Element {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[12px] font-medium ${t.soft} ${t.text}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> : null}
      {label}
    </span>
  );
}

type Deal = {
  id: string;
  status: string;
  statusTone: Tone;
  title: string;
  role: string;
  amount: string;
  counterparty: string;
  fraud: string;
  fraudTone: Tone;
  cta?: { label: string; kind: 'primary' | 'outline' };
  note?: string;
};

const DEALS: Deal[] = [
  {
    id: 'Deal #C2D9',
    status: 'New',
    statusTone: 'neutral',
    title: 'PS5 Console (used)',
    role: "You're buying",
    amount: '$420.00',
    counterparty: 'No counterparty yet',
    fraud: 'Awaiting',
    fraudTone: 'neutral',
    cta: { label: 'Copy one-time link', kind: 'outline' },
  },
  {
    id: 'Deal #B8E1',
    status: 'Connected',
    statusTone: 'accent',
    title: 'iPhone 15 Pro',
    role: "You're buying",
    amount: '$780.00',
    counterparty: 'alex.tran@email.com',
    fraud: 'Medium risk',
    fraudTone: 'warning',
    cta: { label: 'Fund the payment', kind: 'primary' },
  },
  {
    id: 'Deal #A7F3',
    status: 'Held',
    statusTone: 'accent',
    title: '2× Coachella GA Wristbands',
    role: "You're selling",
    amount: '$740.00',
    counterparty: 'jordan.m@email.com',
    fraud: 'Trusted',
    fraudTone: 'success',
    cta: { label: 'Mark as delivered', kind: 'primary' },
  },
  {
    id: 'Deal #9K2P',
    status: 'Completed',
    statusTone: 'success',
    title: 'Herman Miller Aeron',
    role: "You're selling",
    amount: '$610.00',
    counterparty: 'sam.lee@email.com',
    fraud: 'Trusted',
    fraudTone: 'success',
    note: 'Funds released · Jun 12',
  },
];

const TABS: { label: string; count: number }[] = [
  { label: 'All', count: 15 },
  { label: 'New', count: 2 },
  { label: 'Connected', count: 3 },
  { label: 'Held', count: 2 },
  { label: 'Completed', count: 8 },
];

function DealCard({ deal }: { deal: Deal }): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/deal')}
      className="flex flex-col gap-[15px] rounded-[18px] border border-border bg-surface p-[22px] text-left transition-shadow hover:shadow-[0_10px_30px_-12px_rgba(10,40,24,0.12)]"
    >
      <div className="flex items-center justify-between">
        <Pill label={deal.status} tone={deal.statusTone} />
        <span className="text-[13px] font-medium text-muted">{deal.id}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold tracking-[-0.01em]">{deal.title}</div>
          <div className="text-[13px] font-medium text-muted">{deal.role}</div>
        </div>
        <div className="shrink-0 text-[22px] font-semibold tracking-[-0.02em]">{deal.amount}</div>
      </div>

      <div className="h-px w-full bg-separator" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-[30px] w-[30px] rounded-full bg-accent-soft" />
          <span className="text-[14px] font-medium">{deal.counterparty}</span>
        </div>
        <Pill label={deal.fraud} tone={deal.fraudTone} />
      </div>

      {deal.cta ? (
        <span
          className={`flex items-center justify-center rounded-[10px] py-[11px] text-[14px] font-semibold ${
            deal.cta.kind === 'primary'
              ? 'bg-accent text-accent-foreground'
              : 'border border-border text-foreground'
          }`}
        >
          {deal.cta.label}
        </span>
      ) : (
        <span className="text-[14px] font-medium text-muted">{deal.note}</span>
      )}
    </button>
  );
}

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active="dashboard" />

      <main className="flex-1 px-14 pb-16 pt-10">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Your deals</h1>
            <p className="mt-1 text-[15px] text-muted">3 active · 1 needs your action</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/create')}
            className="flex items-center gap-2 rounded-[11px] bg-accent px-[18px] py-[11px] text-[15px] font-semibold text-accent-foreground hover:bg-[var(--accent-hover)]"
          >
            <Icon icon="solar:add-circle-linear" className="text-[18px]" />
            New deal
          </button>
        </div>

        {/* status segmented tabs */}
        <div className="mt-7 inline-flex gap-0.5 rounded-xl bg-black/[0.06] p-1">
          {TABS.map((tab, i) => {
            const isActive = i === 0;
            return (
              <button
                key={tab.label}
                type="button"
                className={`flex items-center gap-2 rounded-lg px-3.5 py-[9px] text-[14px] transition-colors ${
                  isActive ? 'bg-surface font-semibold text-foreground shadow-sm' : 'font-medium text-muted'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-[7px] py-px text-[11px] font-semibold ${
                    isActive ? 'bg-accent-soft text-accent' : 'bg-white/60 text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* deals grid */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {DEALS.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </main>
    </div>
  );
}
