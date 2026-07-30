import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import { Logo } from './Logo.js';

/** Slim in-flow header for focused, single-task screens. */
export function MinimalHeader({ context }: { context: string }): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <header className="flex h-12 items-center justify-between border-b border-header-border px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link to="/" className="shrink-0 text-foreground">
          <Logo className="h-[18px] w-auto" />
        </Link>
        <span className="h-3.5 w-px shrink-0 bg-header-border" aria-hidden="true" />
        <span className="truncate text-sm font-medium text-muted">{context}</span>
      </div>
      <Button size="sm" variant="tertiary" onPress={() => navigate('/')}>
        Cancel
        <Icon icon="solar:close-circle-linear" width={16} />
      </Button>
    </header>
  );
}
