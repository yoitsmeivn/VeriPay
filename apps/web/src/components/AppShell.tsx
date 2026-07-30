import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar.js';

/**
 * Authenticated app frame: the shared left navigation plus a main content area.
 * Every in-app page renders inside this so the nav lives in exactly one place.
 */
export function AppShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className={`h-full min-h-0 flex-1 overflow-y-auto${className ? ` ${className}` : ''}`}>
        {children}
      </main>
    </div>
  );
}
