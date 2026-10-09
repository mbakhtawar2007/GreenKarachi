import React from 'react';
import { apiFetch } from '../api/catalog';

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

  React.useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: '12' });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    setLoading(true);
    apiFetch<NurseryResponse>(`/api/catalog/listings/nurseries?${params.toString()}`)
      .then((data) => { if (active) setResult(data); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load nurseries.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page]);

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

      <form onSubmit={applyFilters} className="mb-8 grid grid-cols-1 gap-4 border-b border-green-200 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-gray-700">Nursery name
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
        </label>
        <label className="text-sm font-medium text-gray-700">City or address
          <input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
        </label>
        <label className="text-sm font-medium text-gray-700">Verification
          <select value={verified} onChange={(event) => setVerified(event.target.value)} className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200">
            <option value="">Any status</option>
            <option value="true">Verified</option>
            <option value="false">Not verified</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="rounded bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900">Search nurseries</button>
        </div>
      </form>

      {loading && <p className="py-12 text-center text-gray-600" role="status">Loading nurseries...</p>}
      {!loading && error && <p className="border-l-4 border-red-700 bg-red-50 p-4 text-red-900" role="alert">{error}</p>}
      {!loading && !error && result?.nurseries.length === 0 && <p className="border-y border-green-200 py-12 text-center text-gray-600">No nurseries match this search.</p>}
      {!loading && !error && result && result.nurseries.length > 0 && <>
        <p className="mb-4 text-sm text-gray-600" aria-live="polite">{result.pagination.total} nursery{result.pagination.total === 1 ? '' : 'ies'} listed</p>
        <div className="divide-y divide-green-200">
          {result.nurseries.map((nursery) => (
            <article key={nursery.user_id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <h2 className="text-lg font-semibold text-green-950">{nursery.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{[nursery.city, nursery.address].filter(Boolean).join(' · ') || 'Location not provided'}</p>
                {nursery.website && <a href={nursery.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-green-800 underline underline-offset-4">Visit website</a>}
              </div>
              <span className={`text-sm font-semibold ${nursery.is_verified ? 'text-green-800' : 'text-gray-600'}`}>
                {nursery.is_verified ? 'Verified' : nursery.verification_status === 'REJECTED' ? 'Not verified' : 'Verification pending'}
              </span>
            </article>
          ))}
        </div>
        <nav aria-label="Nursery directory pages" className="mt-8 flex items-center justify-between border-t border-green-200 pt-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-green-800 px-4 py-2 text-sm font-semibold text-green-900 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-600">Page {result.pagination.page} of {Math.max(result.pagination.totalPages, 1)}</span>
          <button type="button" disabled={page >= result.pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-green-800 px-4 py-2 text-sm font-semibold text-green-900 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </nav>
      </>}
    </section>
  );
};

export default NurseryDirectoryPage;