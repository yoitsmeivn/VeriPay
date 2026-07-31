import { Button, Typography } from '@heroui/react';

import { Logo } from './Logo.js';

interface AuthLoadingScreenProps {
  readonly variant: 'loading' | 'error';
  readonly message?: string;
  readonly detail?: string;
  readonly onRetry?: () => void;
}

/** Full-screen hold while Auth0 checks the session or redirects to Universal Login. */
export function AuthLoadingScreen({
  variant,
  message,
  detail,
  onRetry,
}: AuthLoadingScreenProps): React.JSX.Element {
  const title = message ?? (variant === 'loading' ? 'Signing you in…' : 'Sign-in failed');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo className="h-6 w-auto text-foreground" />
      <div className="flex max-w-sm flex-col gap-2">
        <Typography type="h4" className="text-[22px] font-semibold tracking-[-0.02em]">
          {title}
        </Typography>
        {variant === 'loading' ? (
          <p className="text-[15px] text-muted">Redirecting to secure login…</p>
        ) : (
          detail !== undefined && <p className="text-[15px] text-muted">{detail}</p>
        )}
      </div>
      {variant === 'error' && onRetry !== undefined ? (
        <Button variant="primary" onPress={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
