import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
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
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-green-700">Browse as guest</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;