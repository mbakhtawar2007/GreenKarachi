import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <section className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl font-bold text-green-800 mb-4">
            404
          </div>
          <h2 className="text-2xl text-green-600 mb-6">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div>
            <Link to="/" className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors">
              Go to Homepage
            </Link>
            <span className="mx-2 text-gray-500">|</span>
            <Link to="/marketplace" className="text-green-600 hover:text-green-900 transition-colors">
              Go to Marketplace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NotFoundPage;