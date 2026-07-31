import { Typography } from '@heroui/react';

import { Logo } from './Logo.js';

/** Shown when the SPA is missing its three public Auth0 env vars. */
export function AuthNotConfigured(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo className="h-6 w-auto text-foreground" />
      <div className="flex max-w-md flex-col gap-2">
        <Typography type="h4" className="text-[22px] font-semibold tracking-[-0.02em]">
          Auth0 is not configured
        </Typography>
        <p className="text-[15px] text-muted">
          Set the three public Auth0 variables in your root <code>.env</code> file, then restart
          the dev server. See <code>docs/auth0.md</code> for the full checklist — no Stripe
          Projects required.
        </p>
      </div>
    </div>
  );
}
