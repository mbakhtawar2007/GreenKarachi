import { Link } from 'react-router-dom';
import type { AuthSession } from '../App';

type NavbarProps = {
  session: AuthSession | null;
  onLogout: () => void;
};

const Navbar: React.FC<NavbarProps> = ({ session, onLogout }) => {
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
          {session?.user.roles.includes('NURSERY_OWNER') && <Link to="/inventory" className="whitespace-nowrap text-green-800">Inventory</Link>}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;