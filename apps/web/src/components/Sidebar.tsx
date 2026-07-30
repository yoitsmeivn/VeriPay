import { Avatar, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Logo } from './Logo.js';

const NAV = [
  { label: 'Dashboard', icon: 'solar:widget-2-linear', to: '/' },
  { label: 'Activity', icon: 'solar:chart-2-linear', to: '/activity' },
  { label: 'Settings', icon: 'solar:settings-linear', to: '/settings' },
] as const;

/** Persistent left navigation for the authenticated app. */
export function Sidebar(): React.JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col gap-1 self-start border-r border-border bg-background-secondary px-3 pb-4 pt-4">
      <Link to="/" className="mb-2 px-2 pt-1 text-foreground">
        <Logo className="h-5 w-auto" />
      </Link>

      <Button size="sm" className="w-full" onPress={() => navigate('/create')}>
        <Icon icon="solar:add-circle-linear" width={16} />
        New deal
      </Button>

      <nav className="mt-3 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const isActive = item.to === pathname;
          return (
            <Button
              key={item.label}
              size="sm"
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-2.5 px-2.5 text-[13.5px] ${
                isActive ? 'font-semibold text-foreground' : 'font-medium text-muted'
              }`}
              onPress={() => navigate(item.to)}
            >
              <Icon icon={item.icon} width={16} className={isActive ? '' : 'opacity-70'} />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <Avatar size="sm">
          <Avatar.Fallback className="bg-accent-soft text-[11px] text-accent">AB</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-foreground">Amir Beck</p>
          <p className="truncate text-[11px] leading-tight text-muted">beck@amirbeck.com</p>
        </div>
      </div>
    </aside>
  );
}
