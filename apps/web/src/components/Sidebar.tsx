import { Avatar, Button, Surface } from '@heroui/react';
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
    <Surface
      variant="default"
      className="flex w-[252px] shrink-0 flex-col gap-2 rounded-none border-r border-border px-4 pb-5 pt-[22px]"
    >
      <Link to="/" className="mb-1 px-2 py-1 text-foreground">
        <Logo className="h-[22px] w-auto" />
      </Link>

      <Button className="w-full" onPress={() => navigate('/create')}>
        <Icon icon="solar:add-circle-linear" width={18} />
        New deal
      </Button>

      <div className="mt-2 flex flex-col gap-1">
        {NAV.map((item) => {
          const isActive = item.to === pathname;
          return (
            <Button
              key={item.label}
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-[11px] font-${isActive ? 'semibold' : 'medium'} ${
                isActive ? 'text-foreground' : 'text-muted'
              }`}
              onPress={() => navigate(item.to)}
            >
              <Icon icon={item.icon} width={18} className={isActive ? '' : 'opacity-70'} />
              {item.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-2.5 px-2 pt-2.5">
        <Avatar size="sm">
          <Avatar.Fallback className="bg-accent-soft text-accent">AB</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground">Amir Beck</p>
          <p className="truncate text-[12px] text-muted">beck@amirbeck.com</p>
        </div>
      </div>
    </Surface>
  );
}
