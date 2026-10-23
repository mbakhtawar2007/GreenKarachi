import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AuthSession } from '../App';
import { API_BASE_URL } from '../api/catalog';
import { LogoMark } from '../components/Navbar';

type LoginPageProps = {
  onLogin: (session: AuthSession) => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to sign in.');
      }

      if (!data.token || !data.user) {
        throw new Error('Authentication response was incomplete.');
      }

      onLogin({ token: data.token, user: data.user });
      navigate('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex justify-center py-10 sm:py-14">
      <div className="card w-full max-w-md p-8 shadow-lift sm:p-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark />
          <h2 className="mt-4 text-3xl font-bold text-green-950">Welcome back</h2>
          <p className="mt-1.5 text-sm text-gray-500">Sign in to your GreenKarachi account.</p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label mb-1.5" htmlFor="email">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-green-800 transition-colors hover:text-green-950">
            Register
          </Link>
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
