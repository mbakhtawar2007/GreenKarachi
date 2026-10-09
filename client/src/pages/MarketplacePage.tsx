import React from 'react';
import { apiFetch, type PlantListing } from '../api/catalog';

type ListingResponse = {
  listings: PlantListing[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

const filterFields = [
  { key: 'query', label: 'Plant or keyword', type: 'search' },
  { key: 'species', label: 'Species', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'location', label: 'Location or service area', type: 'text' },
  { key: 'minPrice', label: 'Min price (PKR)', type: 'number' },
  { key: 'maxPrice', label: 'Max price (PKR)', type: 'number' },
  { key: 'minQuantity', label: 'Min available', type: 'number' },
  { key: 'maxQuantity', label: 'Max available', type: 'number' }
] as const;

const currency = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 });

const MarketplacePage: React.FC = () => {
  const [draft, setDraft] = React.useState<Record<string, string>>({ verified: '' });
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(1);
  const [result, setResult] = React.useState<ListingResponse | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: '12' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    setLoading(true);
    setError('');
    apiFetch<ListingResponse>(`/api/catalog/listings?${params.toString()}`)
      .then((data) => { if (active) setResult(data); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load listings.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [filters, page]);

  const handleFilterChange = (key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value.trim())));
    setPage(1);
  };

  const clearFilters = () => {
    setDraft({ verified: '' });
    setFilters({});
    setPage(1);
  };

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Plant listings</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">Marketplace</h1>
        <p className="mt-2 max-w-2xl text-gray-600">Browse currently available plants from nursery owners. Prices are listed per plant in PKR.</p>
      </header>

      <form onSubmit={applyFilters} className="mb-8 border-b border-green-200 pb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filterFields.map((field) => (
            <label key={field.key} className="text-sm font-medium text-gray-700">
              {field.label}
              <input
                type={field.type}
                min={field.type === 'number' ? '0' : undefined}
                step={field.key.includes('Price') ? '0.01' : field.type === 'number' ? '1' : undefined}
                value={draft[field.key] ?? ''}
                onChange={(event) => handleFilterChange(field.key, event.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </label>
          ))}
          <label className="text-sm font-medium text-gray-700">
            Nursery verification
            <select
              value={draft.verified ?? ''}
              onChange={(event) => handleFilterChange('verified', event.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200"
            >
              <option value="">Any status</option>
              <option value="true">Verified</option>
              <option value="false">Not verified</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="rounded bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900">Apply filters</button>
          <button type="button" onClick={clearFilters} className="rounded border border-green-800 px-4 py-2 font-semibold text-green-900 hover:bg-green-50">Clear</button>
          <span className="self-center text-sm text-gray-600" aria-live="polite">
            {result ? `${result.pagination.total} available listing${result.pagination.total === 1 ? '' : 's'}` : ''}
          </span>
        </div>
      </form>

      {loading && <p className="py-12 text-center text-gray-600" role="status">Loading plant listings...</p>}
      {!loading && error && <div className="border-l-4 border-red-700 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
      {!loading && !error && result?.listings.length === 0 && (
        <div className="border-y border-green-200 py-12 text-center">
          <h2 className="text-xl font-semibold text-green-950">No available plants match these filters</h2>
          <p className="mt-2 text-gray-600">Try changing your search or clear the filters.</p>
        </div>
      )}

      {!loading && !error && result && result.listings.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {result.listings.map((listing) => (
              <article key={listing.id} className="overflow-hidden border-b border-green-200 pb-5">
                {listing.image_urls?.[0] ? (
                  <img src={listing.image_urls[0]} alt={listing.name} loading="lazy" className="mb-4 aspect-[4/3] w-full bg-green-100 object-cover" />
                ) : (
                  <div className="mb-4 flex aspect-[4/3] items-center justify-center bg-green-100 text-sm text-green-900">Image not provided</div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-green-950">{listing.name}</h2>
                    <p className="mt-1 text-sm text-gray-600">{listing.species || listing.category}</p>
                  </div>
                  {listing.nursery?.is_verified && <span className="shrink-0 text-xs font-semibold text-green-800">Verified nursery</span>}
                </div>
                {listing.description && <p className="mt-3 line-clamp-3 text-sm text-gray-700">{listing.description}</p>}
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><dt className="text-gray-500">Unit price</dt><dd className="font-semibold text-green-950">{currency.format(Number(listing.unit_price))}</dd></div>
                  <div><dt className="text-gray-500">Available</dt><dd className="font-semibold text-green-950">{listing.available_quantity} plants</dd></div>
                  <div><dt className="text-gray-500">Minimum order</dt><dd>{listing.minimum_order_quantity} plants</dd></div>
                  <div><dt className="text-gray-500">Size</dt><dd>{listing.height || 'Not specified'}</dd></div>
                  <div className="col-span-2"><dt className="text-gray-500">Nursery</dt><dd>{listing.nursery?.name || 'Nursery'}</dd></div>
                  <div className="col-span-2"><dt className="text-gray-500">Location / service area</dt><dd>{[listing.nursery?.city, listing.service_area].filter(Boolean).join(' · ') || 'Not specified'}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <nav aria-label="Marketplace pages" className="mt-8 flex items-center justify-between border-t border-green-200 pt-4">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-green-800 px-4 py-2 text-sm font-semibold text-green-900 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="text-sm text-gray-600">Page {result.pagination.page} of {Math.max(result.pagination.totalPages, 1)}</span>
            <button type="button" disabled={page >= result.pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-green-800 px-4 py-2 text-sm font-semibold text-green-900 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </nav>
        </>
      )}
    </section>
  );
};

export default MarketplacePage;