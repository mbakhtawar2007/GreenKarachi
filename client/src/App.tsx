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

const App: React.FC = () => {
  const [session, setSession] = React.useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem('greenkarachi-session');
      return stored ? JSON.parse(stored) as AuthSession : null;
    } catch {
      return null;
    }
  });

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
          <Route path="collaboration" element={session?.user.roles.includes('NURSERY_OWNER')
            ? <CollaborationPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="projects" element={<ProjectsPage session={session} />} />
          <Route path="login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="register" element={<RegisterPage onLogin={handleLogin} />} />
          <Route path="inventory" element={session?.user.roles.includes('NURSERY_OWNER')
            ? <InventoryPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="quotes" element={session && (session.user.roles.includes('BUYER') || session.user.roles.includes('NURSERY_OWNER'))
            ? <QuotesOrdersPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="admin" element={session?.user.roles.includes('ADMIN')
            ? <AdminPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="notifications" element={session
            ? <NotificationsPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="messages" element={session
            ? <MessagesPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="messages/:id" element={session
            ? <MessagesPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;