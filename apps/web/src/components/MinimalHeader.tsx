import { Link } from 'react-router-dom';

import { Logo } from './Logo.js';

/** Slim in-flow header used by focused, single-task screens. */
export function MinimalHeader({ context }: { context: string }): React.JSX.Element {
  return (
    <>
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-foreground">
            <Logo className="h-5 w-auto" />
          </Link>
          <span className="h-[18px] w-px bg-border" />
          <span className="text-[15px] font-medium text-muted">{context}</span>
        </div>
        <div className="flex items-center gap-3.5">
          <Link to="/" className="text-[14px] font-medium text-muted hover:text-foreground">
            Cancel
          </Link>
          <Link
            to="/"
            aria-label="Close"
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-border text-[12px] text-muted hover:text-foreground"
          >
            ✕
          </Link>
        </div>
      </header>
      <div className="h-px w-full bg-border" />
    </>
  );
}
