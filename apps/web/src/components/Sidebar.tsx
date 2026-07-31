import { useAuth0 } from '@auth0/auth0-react';
import { Avatar, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Logo } from './Logo.js';

const NAV = [
  { label: 'Dashboard', icon: 'solar:widget-2-linear', to: '/' },
  { label: 'Activity', icon: 'solar:chart-2-linear', to: '/activity' },
  { label: 'Settings', icon: 'solar:settings-linear', to: '/settings' },
] as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  }
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

/** Persistent left navigation for the authenticated app. */
export function Sidebar(): React.JSX.Element {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth0();

  const displayName = user?.name ?? user?.email ?? 'Signed in';
  const email = user?.email ?? '';
  const initials = initialsFor(displayName);

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

      <div className="mt-auto flex items-center gap-2 rounded-lg px-2 py-1.5">
        <Avatar size="sm">
          {user?.picture !== undefined ? (
            <Avatar.Image src={user.picture} alt="" />
          ) : null}
          <Avatar.Fallback className="bg-accent-soft text-[11px] text-accent">{initials}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{displayName}</p>
          {email !== '' ? (
            <p className="truncate text-[11px] leading-tight text-muted">{email}</p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Log out"
          onPress={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          <Icon icon="solar:logout-2-linear" width={16} />
        </Button>
      </div>
    </aside>
  );
}
