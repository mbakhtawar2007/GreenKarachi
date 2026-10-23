import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <section className="flex items-center justify-center py-16">
      <div className="card w-full max-w-md p-8 text-center sm:p-10">
        <div className="font-display text-6xl font-bold text-green-800">404</div>
        <h2 className="mt-3 text-2xl font-semibold text-green-950">Page not found</h2>
        <p className="mt-3 leading-relaxed text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">
            Go to homepage
          </Link>
          <Link to="/marketplace" className="btn-secondary">
            Go to marketplace
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NotFoundPage;
