import {
  Button,
  Card,
  Input,
  Label,
  Separator,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import { MinimalHeader } from '../components/MinimalHeader.js';

export function CreateDeal(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <MinimalHeader context="New deal" />

      <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6 px-6 pb-20 pt-11">
        <Link to="/" className="text-[14px] font-medium text-muted hover:text-foreground">
          ← Back to dashboard
        </Link>

        <div>
          <Typography type="h3" className="text-[28px] font-semibold tracking-[-0.03em]">
            Create a deal
          </Typography>
          <p className="mt-2 text-[15px] text-muted">
            Set the terms. You&rsquo;ll get a one-time link to share with the other party.
          </p>
        </div>

        <Card className="flex flex-col gap-[22px] p-8">
          <TextField className="w-full">
            <Label>Deal title</Label>
            <Input placeholder="e.g. 2× Coachella GA Wristbands" />
          </TextField>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <TextArea
              className="h-24 w-full"
              placeholder="Describe the item, condition, and any details the other party should know…"
            />
          </div>

          <TextField className="w-full">
            <Label>Price (USD)</Label>
            <Input placeholder="$0.00" inputMode="decimal" />
          </TextField>

          <div className="flex flex-col gap-2">
            <Label>Your role</Label>
            <ToggleButtonGroup selectionMode="single" defaultSelectedKeys={['buying']} className="w-full">
              <ToggleButton id="buying" className="flex-1">
                Buying
              </ToggleButton>
              <ToggleButton id="selling" className="flex-1">
                Selling
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          <Separator />

          <div className="flex items-start gap-3 rounded-xl bg-accent-soft px-4 py-3">
            <Icon icon="solar:shield-check-linear" width={18} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-[13px] font-medium text-accent-soft-foreground">
              An AI fraud check runs on both parties automatically. Funds are held securely by Stripe and
              released to the seller once the buyer confirms — or after 48 hours.
            </p>
          </div>

          <Button className="w-full" onPress={() => navigate('/created')}>
            Generate deal link
            <Icon icon="solar:arrow-right-linear" width={18} />
          </Button>
        </Card>
      </div>
    </div>
  );
}
