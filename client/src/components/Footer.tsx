import { Link } from 'react-router-dom';
import { LogoMark } from './Navbar';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-green-950 text-green-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-10 w-10 bg-white/10" />
              <span className="font-display text-xl font-bold text-white">GreenKarachi</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-green-200/80">
              The B2B plant marketplace for Karachi — connecting buyers, nursery owners, plantation
              organizers, donors and investors, with nursery-to-nursery collaboration at its core.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-green-300/70">
              Karachi, Pakistan
            </p>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/marketplace" className="text-green-200/80 transition hover:text-white">Marketplace</Link></li>
              <li><Link to="/nursery-directory" className="text-green-200/80 transition hover:text-white">Nursery Directory</Link></li>
              <li><Link to="/collaboration" className="text-green-200/80 transition hover:text-white">Collaboration</Link></li>
              <li><Link to="/projects" className="text-green-200/80 transition hover:text-white">Plantation Projects</Link></li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Account</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/login" className="text-green-200/80 transition hover:text-white">Sign in</Link></li>
              <li><Link to="/register" className="text-green-200/80 transition hover:text-white">Create account</Link></li>
              <li><Link to="/messages" className="text-green-200/80 transition hover:text-white">Messages</Link></li>
              <li><Link to="/notifications" className="text-green-200/80 transition hover:text-white">Notifications</Link></li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 py-5 text-xs text-green-200/60 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} GreenKarachi. All rights reserved.</span>
          <span>Grown for a greener Karachi.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
