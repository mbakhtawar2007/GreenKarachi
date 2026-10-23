import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AuthSession } from '../App';
import { API_BASE_URL } from '../api/catalog';
import { LogoMark } from '../components/Navbar';

type RegisterPageProps = {
  onLogin: (session: AuthSession) => void;
};

const roleOptions = [
  { value: 'BUYER', label: 'Buyer / Business' },
  { value: 'NURSERY_OWNER', label: 'Nursery Owner' },
  { value: 'PLANTATION_ORGANIZER', label: 'Plantation Organizer' },
  { value: 'DONOR', label: 'Donor / Investor' }
] as const;

const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<(typeof roleOptions)[number]['value']>('BUYER');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create account.');
      }

      if (!data.token) {
        // Email confirmation is enabled: the account was created, but no
        // session is issued until the confirmation link is clicked.
        setSuccess(
          `Account created! We've sent a confirmation link to ${email}. Click it, then sign in.`
        );
        return;
      }

      if (!data.user) {
        throw new Error('Account created but authentication response was incomplete.');
      }

      onLogin({ token: data.token, user: data.user });
      navigate('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex justify-center py-10 sm:py-14">
      <div className="card w-full max-w-md p-8 shadow-lift sm:p-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark />
          <h2 className="mt-4 text-3xl font-bold text-green-950">Create account</h2>
          <p className="mt-1.5 text-sm text-gray-500">Join GreenKarachi — it takes a minute.</p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label mb-1.5" htmlFor="name">
              Full name
            </label>
            <input
              type="text"
              id="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="input"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="label mb-1.5" htmlFor="email">
              Email address
            </label>
            <input
              type="email"
              id="email"
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="label mb-1.5" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value as (typeof roleOptions)[number]['value'])}
              className="input"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
              {success}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-green-800 transition-colors hover:text-green-950">
            Sign In
          </Link>
        </p>
      </div>
    </section>
  );
};

export default RegisterPage;
