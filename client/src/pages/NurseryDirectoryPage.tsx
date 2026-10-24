import React from 'react';
import { apiFetch } from '../api/catalog';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

type Nursery = {
  user_id: string;
  name: string;
  city: string | null;
  address: string | null;
  website: string | null;
  verification_status: string;
  is_verified: boolean;
};

type NurseryResponse = {
  nurseries: Nursery[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

const NurseryDirectoryPage: React.FC = () => {
  const [query, setQuery] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [verified, setVerified] = React.useState('');
  const [filters, setFilters] = React.useState({ query: '', location: '', verified: '' });
  const [page, setPage] = React.useState(1);
  const [result, setResult] = React.useState<NurseryResponse | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Silent refresh updates the directory in place without a spinner
  // and without touching the search inputs. A failed silent refresh
  // keeps the previous list.
  const loadNurseries = React.useCallback(async (silent: boolean) => {
    const params = new URLSearchParams({ page: String(page), pageSize: '12' });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<NurseryResponse>(`/api/catalog/listings/nurseries?${params.toString()}`);
      setResult(data);
      setError('');
    } catch (requestError: unknown) {
      if (!silent) setError(requestError instanceof Error ? requestError.message : 'Unable to load nurseries.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters, page]);

  React.useEffect(() => { void loadNurseries(false); }, [loadNurseries]);
  useAutoRefresh(() => { void loadNurseries(true); }, 30000);

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ query: query.trim(), location: location.trim(), verified });
    setPage(1);
  };

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Registered businesses</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">Nursery Directory</h1>
        <p className="mt-2 text-gray-600">Find nurseries by name, location, and verification status.</p>
      </header>

      <form onSubmit={applyFilters} className="card mb-8 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="label">Nursery name
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="input mt-1" />
        </label>
        <label className="label">City or address
          <input value={location} onChange={(event) => setLocation(event.target.value)} className="input mt-1" />
        </label>
        <label className="label">Verification
          <select value={verified} onChange={(event) => setVerified(event.target.value)} className="input mt-1">
            <option value="">Any status</option>
            <option value="true">Verified</option>
            <option value="false">Not verified</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn-primary">Search nurseries</button>
        </div>
        </div>
      </form>

      {loading && <p className="py-12 text-center text-gray-600" role="status">Loading nurseries...</p>}
      {!loading && error && <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
      {!loading && !error && result?.nurseries.length === 0 && <p className="border-y border-green-200 py-12 text-center text-gray-600">No nurseries match this search.</p>}
      {!loading && !error && result && result.nurseries.length > 0 && <>
        <p className="mb-4 text-sm text-gray-600" aria-live="polite">{result.pagination.total} nursery{result.pagination.total === 1 ? '' : 'ies'} listed</p>
        <div className="grid gap-5">
          {result.nurseries.map((nursery) => (
            <article key={nursery.user_id} className="card grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <h2 className="text-lg font-semibold text-green-950">{nursery.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{[nursery.city, nursery.address].filter(Boolean).join(' · ') || 'Location not provided'}</p>
                {nursery.website && (/^https?:\/\//i.test(nursery.website)
                  ? <a href={nursery.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-green-800 underline underline-offset-4 hover:text-green-950">Visit website</a>
                  : <span className="mt-2 inline-block text-sm text-gray-600">{nursery.website}</span>)}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${nursery.is_verified ? 'bg-green-100 text-green-900' : nursery.verification_status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>
                {nursery.is_verified ? 'Verified' : nursery.verification_status === 'REJECTED' ? 'Not verified' : 'Verification pending'}
              </span>
            </article>
          ))}
        </div>
        <nav aria-label="Nursery directory pages" className="mt-8 flex items-center justify-between border-t border-green-200 pt-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="btn-secondary px-4 py-2">Previous</button>
          <span className="text-sm text-gray-600">Page {result.pagination.page} of {Math.max(result.pagination.totalPages, 1)}</span>
          <button type="button" disabled={page >= result.pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="btn-secondary px-4 py-2">Next</button>
        </nav>
      </>}
    </section>
  );
};

export default NurseryDirectoryPage;