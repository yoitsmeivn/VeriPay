import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import { Logo } from './Logo.js';

type NavKey = 'dashboard' | 'activity' | 'settings';

const NAV: { key: NavKey; label: string; icon: string; to: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'solar:widget-2-linear', to: '/' },
  { key: 'activity', label: 'Activity', icon: 'solar:chart-2-linear', to: '/activity' },
  { key: 'settings', label: 'Settings', icon: 'solar:settings-linear', to: '/settings' },
];

/** Persistent left navigation for the authenticated app. */
export function Sidebar({ active }: { active: NavKey }): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <aside className="flex w-[252px] shrink-0 flex-col gap-2 border-r border-border bg-surface px-4 pb-5 pt-[22px]">
      <Link to="/" className="mb-1.5 px-2 text-foreground">
        <Logo className="h-[22px] w-auto" />
      </Link>

      <button
        type="button"
        onClick={() => navigate('/create')}
        className="flex items-center justify-center gap-2 rounded-[11px] bg-accent py-[11px] text-[15px] font-semibold text-accent-foreground transition-colors hover:bg-[var(--accent-hover)]"
      >
        <Icon icon="solar:add-circle-linear" className="text-[18px]" />
        New deal
      </button>

      <nav className="mt-2 flex flex-col gap-[3px]">
        {NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`flex items-center gap-[11px] rounded-[10px] px-3 py-[10px] text-[15px] transition-colors ${
                isActive
                  ? 'bg-black/[0.06] font-semibold text-foreground'
                  : 'font-medium text-muted hover:bg-black/[0.03]'
              }`}
            >
              <Icon icon={item.icon} className={`text-[18px] ${isActive ? '' : 'opacity-70'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 px-2 pt-2.5">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
          AB
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-foreground">Amir Beck</div>
          <div className="truncate text-[12px] text-muted">beck@amirbeck.com</div>
        </div>
      </div>
    </aside>
  );
}
