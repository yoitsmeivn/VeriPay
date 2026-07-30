import { Avatar, Card, Chip, Separator } from '@heroui/react';
import { Icon } from '@iconify/react';

const REASONS = [
  'Confirmed real person — matches LinkedIn + 3 public profiles',
  'Consistent name, photo & history across the web',
  'No scam reports or fraud complaints found online',
  'Email & phone tied to a 5-year digital footprint',
];

const SOURCES = ['LinkedIn', 'Instagram', 'Truecaller', 'News & court records', 'Scam databases'];

type Props = {
  name: string;
  email: string;
  score: number;
  riskLabel: string;
  badge: string;
};

/** AI web-identity verification panel shown for a deal counterparty. */
export function TrustPanel({ name, email, score, riskLabel, badge }: Props): React.JSX.Element {
  return (
    <Card className="flex flex-col gap-4 p-7">
      <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-accent">
        AI identity check · verified on the web
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <Avatar.Fallback className="bg-accent-soft text-accent">
              {name.slice(0, 1).toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.01em]">{name}</p>
            <p className="text-[13px] text-muted">{email}</p>
          </div>
        </div>
        <Chip color="success" variant="soft" size="sm">
          {badge}
        </Chip>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-foreground">Trust score</span>
          <span className="text-[13px] font-medium text-muted">
            <span className="text-[16px] font-semibold text-foreground">{score}</span> / 100 · {riskLabel}
          </span>
        </div>
        <div
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Trust score"
          className="relative h-2 w-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #fe3263 0%, #ff9d3a 50%, #5ec43f 100%)' }}
        >
          {/* mute the portion beyond the score */}
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-black/[0.09]"
            style={{ width: `${100 - score}%` }}
          />
          {/* marker at the score */}
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-foreground shadow-sm"
            style={{ left: `${score}%` }}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2.5">
        {REASONS.map((reason) => (
          <div key={reason} className="flex items-start gap-2.5">
            <Icon
              icon="solar:check-circle-bold"
              width={18}
              className="mt-px shrink-0 text-[#5fc43e]"
            />
            <span className="text-[14px] font-medium">{reason}</span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
          Sources scanned in real time
        </p>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((source) => (
            <Chip key={source} variant="soft" color="default" size="sm">
              {source}
            </Chip>
          ))}
        </div>
        <p className="text-[12px] text-muted">
          VeriPay&rsquo;s AI cross-checks public web sources every time a deal is opened. Last checked just
          now.
        </p>
      </div>
    </Card>
  );
}
