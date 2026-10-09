import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

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
    <div className="min-h-screen bg-green-50">
      <Navbar session={session} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="nursery-directory" element={<NurseryDirectoryPage />} />
          <Route path="collaboration" element={<CollaborationPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="register" element={<RegisterPage onLogin={handleLogin} />} />
          <Route path="inventory" element={session?.user.roles.includes('NURSERY_OWNER')
            ? <InventoryPage session={session} />
            : <Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;