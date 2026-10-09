import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import NurseryDirectoryPage from './pages/NurseryDirectoryPage';
import CollaborationPage from './pages/CollaborationPage';
import ProjectsPage from './pages/ProjectsPage';
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

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-green-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="nursery-directory" element={<NurseryDirectoryPage />} />
          <Route path="collaboration" element={<CollaborationPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;