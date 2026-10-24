import React from 'react';
import { apiFetch, type ListingInput, type PlantListing } from '../api/catalog';
import type { AuthSession } from '../App';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

type NurseryProfile = { name: string; phone?: string | null; city?: string | null; address?: string | null; website?: string | null };
type FormValues = ListingInput & { imageUrlsText: string };

const emptyForm: FormValues = {
  name: '', species: '', category: '', description: '', imageUrls: [], imageUrlsText: '', height: '',
  unitPrice: 0, availableQuantity: 0, minimumOrderQuantity: 1, serviceArea: ''
};

const InventoryPage: React.FC<{ session: AuthSession }> = ({ session }) => {
  const [listings, setListings] = React.useState<PlantListing[]>([]);
  const [profile, setProfile] = React.useState<NurseryProfile>({ name: session.user.name, city: '', address: '' });
  const [hasProfile, setHasProfile] = React.useState(false);
  const [form, setForm] = React.useState<FormValues>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [stockValues, setStockValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  // Silent refresh updates only the listings list. It deliberately does
  // NOT reload the nursery profile, because the profile state is also
  // the profile form's input — reloading it would wipe typing.
  // A failed silent refresh keeps the previous list.
  const loadData = async (silent = false) => {
    if (silent) {
      try {
        const listingData = await apiFetch<{ listings: PlantListing[] }>('/api/catalog/listings/mine', session.token);
        setListings(listingData.listings);
        setError('');
      } catch {
        // Keep the previous list on a failed background refresh.
      }
      return;
    }
    setLoading(true);
    try {
      const [listingData, nurseryData] = await Promise.all([
        apiFetch<{ listings: PlantListing[] }>('/api/catalog/listings/mine', session.token),
        apiFetch<{ nursery: NurseryProfile | null }>('/api/auth/nursery/me', session.token)
      ]);
      setListings(listingData.listings);
      if (nurseryData.nursery) {
        setProfile({ ...nurseryData.nursery });
        setHasProfile(true);
      }
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void loadData(); }, [session.token]);
  useAutoRefresh(() => { void loadData(true); }, 30000);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await apiFetch<{ nursery: NurseryProfile }>('/api/auth/nursery/me', session.token, {
        method: 'PUT', body: JSON.stringify(profile)
      });
      setProfile(result.nursery);
      setHasProfile(true);
      setMessage('Nursery profile saved.');
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save nursery profile.');
    } finally {
      setSaving(false);
    }
  };

  const submitListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const payload: ListingInput = {
      name: form.name,
      species: form.species,
      category: form.category,
      description: form.description,
      imageUrls: form.imageUrlsText.split(/[\r\n,]+/).map((url) => url.trim()).filter(Boolean),
      height: form.height,
      unitPrice: Number(form.unitPrice),
      availableQuantity: Number(form.availableQuantity),
      minimumOrderQuantity: Number(form.minimumOrderQuantity),
      serviceArea: form.serviceArea
    };
    try {
      await apiFetch(`/api/catalog/listings${editingId ? `/${editingId}` : ''}`, session.token, {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload)
      });
      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? 'Listing updated.' : 'Listing created.');
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save listing.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (listing: PlantListing) => {
    setEditingId(listing.id);
    setForm({
      name: listing.name,
      species: listing.species ?? '',
      category: listing.category,
      description: listing.description ?? '',
      imageUrls: listing.image_urls ?? [],
      imageUrlsText: (listing.image_urls ?? []).join('\n'),
      height: listing.height ?? '',
      unitPrice: Number(listing.unit_price),
      availableQuantity: listing.available_quantity,
      minimumOrderQuantity: listing.minimum_order_quantity,
      serviceArea: listing.service_area ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveStock = async (listing: PlantListing) => {
    setError('');
    setMessage('');
    try {
      const availableQuantity = Number(stockValues[listing.id] ?? listing.available_quantity);
      await apiFetch(`/api/catalog/listings/${listing.id}/stock`, session.token, {
        method: 'PATCH', body: JSON.stringify({ availableQuantity })
      });
      setMessage(`Stock updated for ${listing.name}.`);
      await loadData();
    } catch (stockError) {
      setError(stockError instanceof Error ? stockError.message : 'Unable to update stock.');
    }
  };

  const archiveListing = async (listing: PlantListing) => {
    if (!window.confirm(`Archive ${listing.name}? It will no longer appear in public search.`)) return;
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/catalog/listings/${listing.id}`, session.token, { method: 'DELETE' });
      setMessage(`${listing.name} archived.`);
      await loadData();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive listing.');
    }
  };

  const setProfileField = (key: keyof NurseryProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const setFormField = (key: keyof FormValues, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Nursery owner</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">Inventory</h1>
        <p className="mt-2 text-gray-600">Manage your nursery profile, listings, and available whole-plant stock.</p>
      </header>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-800" role="status">{message}</p>}

      <details open={!hasProfile} className="card mb-8 p-5 sm:p-6">
        <summary className="cursor-pointer text-xl font-semibold text-green-950">Nursery profile {hasProfile ? '(saved)' : '(required)'}</summary>
        <form onSubmit={saveProfile} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            ['name', 'Nursery name', true], ['phone', 'Phone', false], ['city', 'City', false],
            ['address', 'Address', false], ['website', 'Website', false]
          ] as const).map(([key, label, required]) => (
            <label key={key} className="label">
              {label}
              <input required={required} type={key === 'website' ? 'url' : 'text'} value={profile[key] ?? ''}
                onChange={(event) => setProfileField(key, event.target.value)}
                className="input mt-1" />
            </label>
          ))}
          <div className="sm:col-span-2">
            <button disabled={saving} className="btn-primary">Save nursery profile</button>
          </div>
        </form>
      </details>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-green-950">{editingId ? 'Edit listing' : 'Add plant listing'}</h2>
          <form onSubmit={submitListing} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                ['name', 'Plant name', 'text'], ['species', 'Species (optional)', 'text'],
                ['category', 'Category', 'text'], ['height', 'Height / size (optional)', 'text'],
                ['unitPrice', 'Unit price (PKR)', 'number'], ['availableQuantity', 'Available plants', 'number'],
                ['minimumOrderQuantity', 'Minimum order quantity', 'number'], ['serviceArea', 'Service area', 'text']
              ] as const).map(([key, label, type]) => (
                <label key={key} className="label">
                  {label}
                  <input required={!['species', 'height'].includes(key)} min={type === 'number' ? (key === 'unitPrice' ? '0.01' : key === 'minimumOrderQuantity' ? '1' : '0') : undefined}
                    step={key === 'unitPrice' ? '0.01' : type === 'number' ? '1' : undefined} type={type}
                    value={form[key] as string | number} onChange={(event) => setFormField(key, type === 'number' ? Number(event.target.value) : event.target.value)}
                    className="input mt-1" />
                </label>
              ))}
            </div>
            <label className="label">Description
              <textarea rows={3} maxLength={2000} value={form.description} onChange={(event) => setFormField('description', event.target.value)}
                className="input mt-1" />
            </label>
            <label className="label">Image URLs (HTTP/HTTPS, one per line)
              <textarea rows={2} value={form.imageUrlsText} onChange={(event) => setFormField('imageUrlsText', event.target.value)}
                className="input mt-1" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button disabled={saving || !hasProfile} className="btn-primary">
                {saving ? 'Saving...' : editingId ? 'Save listing' : 'Create listing'}
              </button>
              {editingId && <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="btn-secondary">Cancel edit</button>}
            </div>
          </form>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-green-950">Your listings</h2>
          {loading && <p className="py-12 text-center text-gray-600" role="status">Loading inventory...</p>}
          {!loading && listings.length === 0 && <p className="py-8 text-center text-gray-600">No listings yet.</p>}
          <div className="mt-4 divide-y divide-green-200">
            {listings.map((listing) => (
              <article key={listing.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-green-950">{listing.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{listing.category}{listing.species ? ` · ${listing.species}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${listing.status === 'ACTIVE' ? 'bg-green-100 text-green-900' : listing.status === 'OUT_OF_STOCK' ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'}`}>{listing.status.replaceAll('_', ' ')}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="label">Available plants
                    <input type="number" min="0" step="1" value={stockValues[listing.id] ?? listing.available_quantity}
                      onChange={(event) => setStockValues((current) => ({ ...current, [listing.id]: event.target.value }))}
                      className="input mt-1 w-32" />
                  </label>
                  <button type="button" onClick={() => void saveStock(listing)} className="btn-secondary px-3 py-2 text-sm">Update stock</button>
                  <button type="button" onClick={() => startEdit(listing)} className="btn-secondary px-3 py-2 text-sm">Edit</button>
                  {listing.status !== 'ARCHIVED' && <button type="button" onClick={() => void archiveListing(listing)} className="rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50">Archive</button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default InventoryPage;