import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import NurseryDirectoryPage from './pages/NurseryDirectoryPage';
import CollaborationPage from './pages/CollaborationPage';
import ProjectsPage from './pages/ProjectsPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InventoryPage from './pages/InventoryPage';
import QuotesOrdersPage from './pages/QuotesOrdersPage';
import AdminPage from './pages/AdminPage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
};

// The stored session is untrusted input: a stale or hand-edited value
// must not pass as a session. Anything that fails this shape check is
// treated as signed out, instead of crashing a role-gated page later.
const isValidSession = (value: unknown): value is AuthSession => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { token?: unknown; user?: { id?: unknown; email?: unknown; name?: unknown; roles?: unknown } };
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    typeof candidate.user?.id === 'string' &&
    typeof candidate.user?.email === 'string' &&
    typeof candidate.user?.name === 'string' &&
    Array.isArray(candidate.user?.roles) &&
    candidate.user.roles.every((role) => typeof role === 'string')
  );
};

const App: React.FC = () => {
  const [session, setSession] = React.useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem('greenkarachi-session');
      const parsed: unknown = stored ? JSON.parse(stored) : null;
      return isValidSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });

  // Signed-out users go to /login; signed-in users without the role go
  // home instead of being bounced to /login, which used to look like
  // they had been signed out.
  const requireRole = (allowed: boolean, element: React.ReactNode) =>
    !session ? <Navigate to="/login" replace /> : allowed ? element : <Navigate to="/" replace />;
  const requireSession = (element: React.ReactNode) =>
    session ? element : <Navigate to="/login" replace />;

  const handleLogin = (nextSession: AuthSession) => {
    localStorage.setItem('greenkarachi-session', JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    localStorage.removeItem('greenkarachi-session');
    setSession(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f6] font-sans text-gray-800">
      <ScrollToTop />
      <Navbar session={session} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="marketplace" element={<MarketplacePage session={session} />} />
          <Route path="nursery-directory" element={<NurseryDirectoryPage />} />
          <Route path="collaboration" element={requireRole(session?.user.roles.includes('NURSERY_OWNER') ?? false, session ? <CollaborationPage session={session} /> : null)} />
          <Route path="projects" element={<ProjectsPage session={session} />} />
          <Route path="login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="register" element={<RegisterPage onLogin={handleLogin} />} />
          <Route path="inventory" element={requireRole(session?.user.roles.includes('NURSERY_OWNER') ?? false, session ? <InventoryPage session={session} /> : null)} />
          <Route path="quotes" element={requireRole(Boolean(session && (session.user.roles.includes('BUYER') || session.user.roles.includes('NURSERY_OWNER'))), session ? <QuotesOrdersPage session={session} /> : null)} />
          <Route path="admin" element={requireRole(session?.user.roles.includes('ADMIN') ?? false, session ? <AdminPage session={session} /> : null)} />
          <Route path="notifications" element={requireSession(session ? <NotificationsPage session={session} /> : null)} />
          <Route path="messages" element={requireSession(session ? <MessagesPage session={session} /> : null)} />
          <Route path="messages/:id" element={requireSession(session ? <MessagesPage session={session} /> : null)} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;