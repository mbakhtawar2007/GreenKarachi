import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuthSession } from '../App';
import { getUnreadNotificationCount } from '../api/notifications';

type NavbarProps = {
  session: AuthSession | null;
  onLogout: () => void;
};

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

  const unreadBadge = unreadCount > 0 && (
    <span
      className="ml-1 inline-block rounded-full bg-red-700 px-1.5 py-0.5 align-middle text-xs font-bold text-white"
      aria-label={`${unreadCount} unread notifications`}
    >
      {unreadCount}
    </span>
  );
  return (
    <nav className="bg-white shadow-sm border-b border-green-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-bold text-2xl text-green-800">
            GreenKarachi
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/marketplace" className="text-green-700 hover:text-green-900 transition-colors">
              Marketplace
            </Link>
            <Link to="/nursery-directory" className="text-green-700 hover:text-green-900 transition-colors">
              Nursery Directory
            </Link>
            <Link to="/collaboration" className="text-green-700 hover:text-green-900 transition-colors">
              Collaboration
            </Link>
            <Link to="/projects" className="text-green-700 hover:text-green-900 transition-colors">
              Projects
            </Link>
            {session?.user.roles.includes('NURSERY_OWNER') && (
              <Link to="/inventory" className="text-green-700 hover:text-green-900 transition-colors">
                Inventory
              </Link>
            )}
            {session && (session.user.roles.includes('BUYER') || session.user.roles.includes('NURSERY_OWNER')) && (
              <Link to="/quotes" className="text-green-700 hover:text-green-900 transition-colors">
                Quotes &amp; Orders
              </Link>
            )}
            {session?.user.roles.includes('ADMIN') && (
              <Link to="/admin" className="text-green-700 hover:text-green-900 transition-colors">
                Admin
              </Link>
            )}
            {session && (
              <Link to="/messages" className="text-green-700 hover:text-green-900 transition-colors">
                Messages
              </Link>
            )}
            {session && (
              <Link to="/notifications" className="text-green-700 hover:text-green-900 transition-colors">
                Notifications{unreadBadge}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="hidden sm:inline text-sm font-medium text-green-700">{session.user.name}</span>
                <button type="button" onClick={onLogout} className="text-sm text-green-800 underline underline-offset-4">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-green-800">Sign in</Link>
                <Link to="/register" className="text-sm font-semibold text-white bg-green-700 px-3 py-2 rounded">Create account</Link>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-x-5 gap-y-2 overflow-x-auto text-sm md:hidden">
          <Link to="/marketplace" className="whitespace-nowrap text-green-800">Marketplace</Link>
          <Link to="/nursery-directory" className="whitespace-nowrap text-green-800">Nurseries</Link>
          <Link to="/collaboration" className="whitespace-nowrap text-green-800">Collaboration</Link>
          <Link to="/projects" className="whitespace-nowrap text-green-800">Projects</Link>
          {session?.user.roles.includes('NURSERY_OWNER') && <Link to="/inventory" className="whitespace-nowrap text-green-800">Inventory</Link>}
          {session && (session.user.roles.includes('BUYER') || session.user.roles.includes('NURSERY_OWNER')) && <Link to="/quotes" className="whitespace-nowrap text-green-800">Quotes &amp; Orders</Link>}
          {session?.user.roles.includes('ADMIN') && <Link to="/admin" className="whitespace-nowrap text-green-800">Admin</Link>}
          {session && <Link to="/messages" className="whitespace-nowrap text-green-800">Messages</Link>}
          {session && <Link to="/notifications" className="whitespace-nowrap text-green-800">Notifications{unreadBadge}</Link>}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;