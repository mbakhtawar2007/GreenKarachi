import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import NurseryDirectoryPage from './pages/NurseryDirectoryPage';
import CollaborationPage from './pages/CollaborationPage';
import ProjectsPage from './pages/ProjectsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

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

const AUTH_STORAGE_KEY = 'greenkarachi-auth';

const readStoredAuth = (): AuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const App: React.FC = () => {
  const [auth, setAuth] = React.useState<AuthSession | null>(readStoredAuth);

  React.useEffect(() => {
    if (auth) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [auth]);

  const handleLogin = (session: AuthSession) => {
    setAuth(session);
  };

  const handleLogout = () => {
    setAuth(null);
  };

  return (
    <div className="min-h-screen bg-green-50">
      <Navbar user={auth?.user ?? null} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="nursery-directory" element={<NurseryDirectoryPage />} />
          <Route path="collaboration" element={<CollaborationPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="register" element={<RegisterPage onLogin={handleLogin} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;