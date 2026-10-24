import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { AuthSession } from '../App';
import { getUnreadNotificationCount } from '../api/notifications';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

type NavbarProps = {
  session: AuthSession | null;
  onLogout: () => void;
};

export const LogoMark: React.FC<{ className?: string }> = ({ className = 'h-10 w-10 bg-green-800' }) => (
  <span className={`grid shrink-0 place-items-center rounded-xl text-white ${className}`} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M5 19C5 9.5 12.5 4.5 20 4c.5 7.5-5 15-15 15Zm0 0c2.5-5 6.5-8.5 11-10.5" />
    </svg>
  </span>
);

const Navbar: React.FC<NavbarProps> = ({ session, onLogout }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setUnreadCount(0);
      return;
    }
    getUnreadNotificationCount(session.token)
      .then((data) => {
        if (!cancelled) setUnreadCount(data.unreadCount);
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // The badge used to load only at sign-in. It now refreshes in the
  // background while signed in; a failed refresh keeps the last count.
  useAutoRefresh(() => {
    if (!session) return;
    getUnreadNotificationCount(session.token)
      .then((data) => setUnreadCount(data.unreadCount))
      .catch(() => undefined);
  }, 30000);

  const unreadBadge = unreadCount > 0 && (
    <span
      className="ml-1.5 inline-block rounded-full bg-red-600 px-1.5 py-0.5 align-middle text-[11px] font-bold leading-none text-white"
      aria-label={`${unreadCount} unread notifications`}
    >
      {unreadCount}
    </span>
  );

  const links: { to: string; label: string; badge?: boolean }[] = [
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/nursery-directory', label: 'Nursery Directory' },
    { to: '/collaboration', label: 'Collaboration' },
    { to: '/projects', label: 'Projects' },
    ...(session?.user.roles.includes('NURSERY_OWNER') ? [{ to: '/inventory', label: 'Inventory' }] : []),
    ...(session && (session.user.roles.includes('BUYER') || session.user.roles.includes('NURSERY_OWNER'))
      ? [{ to: '/quotes', label: 'Quotes & Orders' }]
      : []),
    ...(session?.user.roles.includes('ADMIN') ? [{ to: '/admin', label: 'Admin' }] : []),
    ...(session ? [{ to: '/messages', label: 'Messages' }] : []),
    ...(session ? [{ to: '/notifications', label: 'Notifications', badge: true }] : []),
  ];

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-2 text-sm font-medium transition ${
      isActive ? 'bg-green-100 text-green-950' : 'text-green-900/70 hover:bg-green-50 hover:text-green-950'
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
      isActive ? 'bg-green-800 text-white' : 'bg-green-50 text-green-900'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-green-900/10 bg-white/90 shadow-[0_1px_0_rgba(20,83,45,0.04)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="GreenKarachi home">
            <LogoMark />
            <span className="leading-tight">
              <span className="block font-display text-xl font-bold text-green-950">GreenKarachi</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-green-700 sm:block">
                Plant Marketplace
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={desktopLinkClass}>
                {link.label}
                {link.badge ? unreadBadge : null}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium text-green-950 md:inline">
                  {session.user.name}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full border border-green-900/15 px-3.5 py-2 text-sm font-medium text-green-900 transition hover:bg-green-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-green-900 transition hover:bg-green-50"
                >
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary px-4 py-2">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-3 lg:hidden" aria-label="Main mobile">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={mobileLinkClass}>
              {link.label}
              {link.badge ? unreadBadge : null}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
