import { Button, Card, Input, toast, Typography } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

import { MinimalHeader } from '../components/MinimalHeader.js';
import { copyDealLink, SAMPLE_DEAL_LINK_DISPLAY } from '../lib/copy-deal-link.js';

async function handleCopyLink(): Promise<void> {
  const copied = await copyDealLink();
  if (copied) {
    toast.success('Link copied', {
      description: 'Share it once — it opens a single time.',
    });
    return;
  }

  toast.danger('Could not copy link', {
    description: 'Try selecting the link and copying manually.',
  });
}

export function DealCreated(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <MinimalHeader context="Deal created" />

      <div className="mx-auto flex w-full max-w-[560px] px-6 pb-20 pt-16">
        <Card className="flex w-full flex-col items-center gap-5 p-11 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-accent-soft">
            <Icon icon="solar:check-circle-bold" width={32} className="text-accent" />
          </div>

          <Typography type="h4" className="text-[26px] font-semibold tracking-[-0.02em]">
            Your deal is ready
          </Typography>
          <p className="text-[15px] text-muted">
            Share this one-time link with the other party. It opens once, then this deal moves to your
            dashboard.
          </p>

          <div className="flex w-full items-center gap-2">
            <Input
              readOnly
              value={SAMPLE_DEAL_LINK_DISPLAY}
              aria-label="One-time deal link"
              className="flex-1"
            />
            <Button variant="outline" onPress={() => void handleCopyLink()}>
              <Icon icon="solar:copy-linear" width={16} />
              Copy link
            </Button>
          </div>

          <div className="flex w-full items-start gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-left">
            <Icon icon="solar:danger-triangle-linear" width={18} className="mt-0.5 shrink-0 text-[#8a5b34]" />
            <p className="text-[13px] font-medium text-[#8a5b34]">
              This link works once. After it opens, manage the deal from your dashboard.
            </p>
          </div>

          <div className="flex w-full gap-3 pt-1">
            <Button className="flex-1" onPress={() => navigate('/')}>
              Go to dashboard
            </Button>
            <Button variant="outline" className="flex-1" onPress={() => navigate('/create')}>
              Create another
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
