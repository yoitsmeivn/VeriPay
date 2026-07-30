import {
  Avatar,
  Button,
  Card,
  Chip,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar.js';

type ChipColor = 'default' | 'accent' | 'success' | 'warning';

type Deal = {
  id: string;
  status: string;
  statusColor: ChipColor;
  title: string;
  role: string;
  amount: string;
  counterparty: string;
  fraud: string;
  fraudColor: ChipColor;
  cta?: { label: string; primary: boolean };
  note?: string;
};

const DEALS: Deal[] = [
  {
    id: 'Deal #C2D9',
    status: 'New',
    statusColor: 'default',
    title: 'PS5 Console (used)',
    role: "You're buying",
    amount: '$420.00',
    counterparty: 'No counterparty yet',
    fraud: 'Awaiting',
    fraudColor: 'default',
    cta: { label: 'Copy one-time link', primary: false },
  },
  {
    id: 'Deal #B8E1',
    status: 'Connected',
    statusColor: 'accent',
    title: 'iPhone 15 Pro',
    role: "You're buying",
    amount: '$780.00',
    counterparty: 'alex.tran@email.com',
    fraud: 'Medium risk',
    fraudColor: 'warning',
    cta: { label: 'Fund the payment', primary: true },
  },
  {
    id: 'Deal #A7F3',
    status: 'Held',
    statusColor: 'accent',
    title: '2× Coachella GA Wristbands',
    role: "You're selling",
    amount: '$740.00',
    counterparty: 'jordan.m@email.com',
    fraud: 'Trusted',
    fraudColor: 'success',
    cta: { label: 'Mark as delivered', primary: true },
  },
  {
    id: 'Deal #9K2P',
    status: 'Completed',
    statusColor: 'success',
    title: 'Herman Miller Aeron',
    role: "You're selling",
    amount: '$610.00',
    counterparty: 'sam.lee@email.com',
    fraud: 'Trusted',
    fraudColor: 'success',
    note: 'Funds released · Jun 12',
  },
];

const TABS = [
  { label: 'All', count: 15 },
  { label: 'New', count: 2 },
  { label: 'Connected', count: 3 },
  { label: 'Held', count: 2 },
  { label: 'Completed', count: 8 },
];

function DealCard({ deal }: { deal: Deal }): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Card className="flex flex-col gap-[15px] p-[22px]">
      <div className="flex items-center justify-between">
        <Chip color={deal.statusColor} variant="soft" size="sm">
          {deal.status}
        </Chip>
        <span className="text-[13px] font-medium text-muted">{deal.id}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold tracking-[-0.01em]">{deal.title}</p>
          <p className="text-[13px] font-medium text-muted">{deal.role}</p>
        </div>
        <span className="shrink-0 text-[22px] font-semibold tracking-[-0.02em]">{deal.amount}</span>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <Avatar.Fallback className="bg-accent-soft text-accent">
              {deal.counterparty.slice(0, 1).toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
          <span className="text-[14px] font-medium">{deal.counterparty}</span>
        </div>
        <Chip color={deal.fraudColor} variant="soft" size="sm">
          {deal.fraud}
        </Chip>
      </div>

      {deal.cta ? (
        <Button
          variant={deal.cta.primary ? 'primary' : 'outline'}
          className="w-full"
          onPress={() => navigate('/deal')}
        >
          {deal.cta.label}
        </Button>
      ) : (
        <span className="text-[14px] font-medium text-muted">{deal.note}</span>
      )}
    </Card>
  );
}

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 px-14 pb-16 pt-10">
        <div className="flex items-center justify-between">
          <div>
            <Typography type="h3" className="text-[28px] font-semibold tracking-[-0.03em]">
              Your deals
            </Typography>
            <p className="mt-1 text-[15px] text-muted">3 active · 1 needs your action</p>
          </div>
          <Button onPress={() => navigate('/create')}>
            <Icon icon="solar:add-circle-linear" width={18} />
            New deal
          </Button>
        </div>

        <ToggleButtonGroup
          selectionMode="single"
          defaultSelectedKeys={['All']}
          className="mt-7 w-fit"
          aria-label="Filter deals by status"
        >
          {TABS.map((tab) => (
            <ToggleButton key={tab.label} id={tab.label}>
              {tab.label}
              <Chip size="sm" variant="soft" color="default">
                {tab.count}
              </Chip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {DEALS.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </main>
    </div>
  );
}
