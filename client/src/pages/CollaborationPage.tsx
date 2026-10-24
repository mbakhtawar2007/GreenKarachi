import React from 'react';
import {
  acceptSupplyOffer,
  changeSupplyGapRequestStatus,
  createSupplyGapRequest,
  getMySupplyGapRequests,
  getMySupplyOffers,
  getOpenSupplyGapRequests,
  rejectSupplyOffer,
  submitSupplyOffer,
  updateSupplyGapRequest,
  withdrawSupplyOffer,
  type SupplyGapRequest,
  type SupplyOffer
} from '../api/collaboration';
import type { AuthSession } from '../App';
import MessageButton from '../components/MessageButton';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const currency = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 });
const formatMoney = (value: string | number) => currency.format(Number(value));
const statusLabel = (status: string) => status.replaceAll('_', ' ');

// Presentation only: pill colors by status family. The status text is unchanged.
const statusPillClass = (status: string) => {
  if (['ACCEPTED', 'CONFIRMED', 'FULFILLED'].includes(status)) return 'bg-green-100 text-green-900';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-900';
  if (['REJECTED', 'WITHDRAWN', 'CANCELLED', 'DECLINED'].includes(status)) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-700';
};
const statusPillBase = 'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold';

type RequestForm = {
  plantName: string;
  species: string;
  totalRequired: string;
  stockAvailable: string;
  requirements: string;
  neededBy: string;
  area: string;
  notes: string;
};

const emptyForm: RequestForm = {
  plantName: '',
  species: '',
  totalRequired: '100',
  stockAvailable: '0',
  requirements: '',
  neededBy: '',
  area: '',
  notes: ''
};

type OfferForm = { quantity: string; unitPrice: string; availabilityCondition: string; deliveryArrangement: string; notes: string };
const emptyOfferForm: OfferForm = { quantity: '', unitPrice: '', availabilityCondition: '', deliveryArrangement: '', notes: '' };

const inputClass = 'input mt-1';

// The breakdown every participant reasons with. Only ACCEPTED offers are
// committed supply; pending offers are still just offers.
const Breakdown: React.FC<{ request: SupplyGapRequest }> = ({ request }) => {
  const pendingOffered = (request.offers ?? [])
    .filter((offer) => offer.status === 'PENDING')
    .reduce((sum, offer) => sum + offer.quantity, 0);
  const summary = request.summary ?? {
    quantity_needed: request.quantity_needed,
    offered_quantity: pendingOffered,
    committed_quantity: request.committed_quantity,
    remaining_gap: Math.max(0, request.quantity_needed - request.committed_quantity)
  };
  const rows: Array<[string, number]> = [
    ['Total required', request.total_required],
    ['Your available stock', request.stock_available],
    ['Quantity needed (gap)', summary.quantity_needed],
    ['Offered, still pending', summary.offered_quantity],
    ['Committed (accepted offers)', summary.committed_quantity],
    ['Remaining gap', summary.remaining_gap]
  ];
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-green-50/70 px-3 py-2">
          <dt className="text-gray-500">{label}</dt>
          <dd className="font-semibold text-green-950">{value} plants</dd>
        </div>
      ))}
    </dl>
  );
};

const CollaborationPage: React.FC<{ session: AuthSession }> = ({ session }) => {
  const [myRequests, setMyRequests] = React.useState<SupplyGapRequest[]>([]);
  const [openRequests, setOpenRequests] = React.useState<SupplyGapRequest[]>([]);
  const [myOffers, setMyOffers] = React.useState<SupplyOffer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const [form, setForm] = React.useState<RequestForm>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [offerForms, setOfferForms] = React.useState<Record<string, OfferForm>>({});

  // Silent refresh updates requests and offers in place without a
  // spinner and without touching the request/offer forms. A failed
  // silent refresh keeps the previous data.
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [mine, open, offers] = await Promise.all([
        getMySupplyGapRequests(session.token),
        getOpenSupplyGapRequests(session.token),
        getMySupplyOffers(session.token)
      ]);
      setMyRequests(mine.supplyGapRequests);
      setOpenRequests(open.supplyGapRequests);
      setMyOffers(offers.supplyOffers);
      setError('');
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : 'Unable to load collaboration data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  React.useEffect(() => { void loadData(); }, [session.token]);
  useAutoRefresh(() => { void loadData(true); }, 30000);

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The action could not be completed.');
    } finally {
      setSaving(false);
    }
  };

  const formGap = Math.max(0, Number(form.totalRequired || 0) - Number(form.stockAvailable || 0));

  const submitRequestForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      plantName: form.plantName,
      species: form.species,
      totalRequired: Number(form.totalRequired),
      stockAvailable: Number(form.stockAvailable),
      requirements: form.requirements,
      neededBy: form.neededBy,
      area: form.area,
      notes: form.notes
    };
    if (editingId) {
      await runAction(async () => {
        await updateSupplyGapRequest(session.token, editingId, input);
        setEditingId(null);
        setForm(emptyForm);
      }, 'Supply gap request updated. The quantity needed was recalculated on the server.');
    } else {
      await runAction(async () => {
        await createSupplyGapRequest(session.token, input);
        setForm(emptyForm);
      }, 'Supply gap request published. Other nurseries can now offer stock against the gap.');
    }
  };

  const startEditing = (request: SupplyGapRequest) => {
    setEditingId(request.id);
    setForm({
      plantName: request.plant_name,
      species: request.species ?? '',
      totalRequired: String(request.total_required),
      stockAvailable: String(request.stock_available),
      requirements: request.requirements ?? '',
      neededBy: request.needed_by,
      area: request.area,
      notes: request.notes ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setOfferField = (requestId: string, key: keyof OfferForm, value: string) =>
    setOfferForms((current) => ({ ...current, [requestId]: { ...(current[requestId] ?? emptyOfferForm), [key]: value } }));

  const submitOffer = async (request: SupplyGapRequest) => {
    const values = offerForms[request.id] ?? emptyOfferForm;
    await runAction(
      () => submitSupplyOffer(session.token, request.id, {
        quantity: Number(values.quantity),
        unitPrice: Number(values.unitPrice),
        availabilityCondition: values.availabilityCondition,
        deliveryArrangement: values.deliveryArrangement,
        notes: values.notes
      }),
      'Offer submitted as pending. It only counts as committed supply if the requesting nursery accepts it.'
    );
  };

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Nursery collaboration</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">Supply-gap requests &amp; supplier offers</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Short on stock for a big order? Publish the gap between what you need and what you have, and other
          nurseries can offer their stock. Only <strong>accepted</strong> offers count as committed supply — and a
          commitment is <strong>not proof of delivery</strong>. Delivery and payment are arranged directly between
          the nurseries involved; GreenKarachi does not process any payment.
        </p>
      </header>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900" role="alert">{error}</p>}
      {message && <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900" role="status">{message}</p>}
      {loading && <p className="py-12 text-center text-gray-600" role="status">Loading collaboration...</p>}

      {!loading && (
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold text-green-950">{editingId ? 'Edit supply gap request' : 'Publish a supply gap request'}</h2>
            <form onSubmit={submitRequestForm} className="card mt-4 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:max-w-3xl">
              <label className="label">Plant name
                <input required type="text" maxLength={120} value={form.plantName} placeholder="e.g. Neem"
                  onChange={(event) => setForm((current) => ({ ...current, plantName: event.target.value }))} className={inputClass} />
              </label>
              <label className="label">Species (optional)
                <input type="text" maxLength={120} value={form.species} placeholder="e.g. Azadirachta indica"
                  onChange={(event) => setForm((current) => ({ ...current, species: event.target.value }))} className={inputClass} />
              </label>
              <label className="label">Total quantity required
                <input required type="number" min="1" step="1" value={form.totalRequired}
                  onChange={(event) => setForm((current) => ({ ...current, totalRequired: event.target.value }))} className={inputClass} />
              </label>
              <label className="label">Stock you already have
                <input required type="number" min="0" step="1" value={form.stockAvailable}
                  onChange={(event) => setForm((current) => ({ ...current, stockAvailable: event.target.value }))} className={inputClass} />
              </label>
              <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-gray-700 sm:col-span-2" role="status">
                Quantity needed (gap) = {Number(form.totalRequired || 0)} required − {Number(form.stockAvailable || 0)} in stock ={' '}
                <strong>{formGap} plants</strong>. The server recalculates this when you save.
              </p>
              <label className="label">Needed by
                <input required type="date" min={new Date().toLocaleDateString('en-CA')} value={form.neededBy}
                  onChange={(event) => setForm((current) => ({ ...current, neededBy: event.target.value }))} className={inputClass} />
              </label>
              <label className="label">Area
                <input required type="text" maxLength={160} value={form.area} placeholder="e.g. Clifton, Karachi"
                  onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className={inputClass} />
              </label>
              <label className="label sm:col-span-2">Requirements (optional)
                <textarea rows={2} maxLength={2000} value={form.requirements}
                  onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))} className={inputClass} />
              </label>
              <label className="label sm:col-span-2">Notes (optional)
                <textarea rows={2} maxLength={2000} value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={inputClass} />
              </label>
              <div className="flex gap-3 sm:col-span-2">
                <button disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Publish request'}
                </button>
                {editingId && (
                  <button type="button" disabled={saving} onClick={() => { setEditingId(null); setForm(emptyForm); }}
                    className="btn-secondary">Cancel edit</button>
                )}
              </div>
            </form>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-950">My supply gap requests</h2>
            {myRequests.length === 0 && <p className="mt-4 rounded-2xl border border-dashed border-green-900/20 px-5 py-6 text-center text-gray-600">No supply gap requests yet.</p>}
            <div className="mt-4 space-y-4">
              {myRequests.map((request) => (
                <article key={request.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-green-950">
                        {request.plant_name}{request.species ? ` (${request.species})` : ''}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">Needed by {request.needed_by} · {request.area}</p>
                      {request.requirements && <p className="mt-1 text-sm text-gray-600">Requirements: {request.requirements}</p>}
                      {request.notes && <p className="mt-1 text-sm text-gray-600">{request.notes}</p>}
                    </div>
                    <span className={`${statusPillBase} ${statusPillClass(request.status)}`}>{statusLabel(request.status)}</span>
                  </div>
                  <Breakdown request={request} />
                  <div className="mt-3">
                    <MessageButton token={session.token} refType="SUPPLY_GAP_REQUEST" refId={request.id} label="Message participants" />
                  </div>
                  {(request.offers ?? []).length > 0 && (
                    <div className="mt-3 space-y-3">
                      <h4 className="text-sm font-semibold text-green-950">Offers received</h4>
                      {(request.offers ?? []).map((offer) => (
                        <div key={offer.id} className="rounded-2xl border border-green-900/10 bg-green-50/50 p-4">
                          <p className="text-sm text-gray-700">
                            <strong>{offer.supplier_nursery?.name || 'Another nursery'}</strong> offered {offer.quantity} plants at{' '}
                            {formatMoney(offer.unit_price)} each — <span className={`${statusPillBase} ${statusPillClass(offer.status)}`}>{statusLabel(offer.status)}</span>
                          </p>
                          <p className="text-sm text-gray-600">Availability: {offer.availability_condition}</p>
                          <p className="text-sm text-gray-600">Delivery: {offer.delivery_arrangement}</p>
                          {offer.notes && <p className="text-sm text-gray-600">{offer.notes}</p>}
                          {offer.status === 'ACCEPTED' && (
                            <p className="text-sm text-gray-600">This supply is committed. It is not proof of delivery — coordinate delivery with the supplier directly.</p>
                          )}
                          {offer.status === 'PENDING' && request.status === 'OPEN' && (
                            <div className="mt-2 flex flex-wrap gap-3">
                              <button type="button" disabled={saving}
                                onClick={() => void runAction(() => acceptSupplyOffer(session.token, offer.id), 'Offer accepted. That quantity is now committed supply — this is a commitment, not proof of delivery.')}
                                className="btn-primary px-3 py-1.5 text-sm">Accept offer</button>
                              <button type="button" disabled={saving}
                                onClick={() => void runAction(() => rejectSupplyOffer(session.token, offer.id), 'Offer rejected.')}
                                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50">Reject offer</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {request.status === 'OPEN' && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button type="button" disabled={saving} onClick={() => startEditing(request)}
                        className="btn-secondary px-3 py-1.5 text-sm">Edit request</button>
                      <button type="button" disabled={saving}
                        onClick={() => void runAction(() => changeSupplyGapRequestStatus(session.token, request.id, 'CLOSED'), 'Request closed. It no longer accepts offers.')}
                        className="btn-secondary px-3 py-1.5 text-sm">Close request</button>
                      <button type="button" disabled={saving}
                        onClick={() => void runAction(() => changeSupplyGapRequestStatus(session.token, request.id, 'CANCELLED'), 'Request cancelled.')}
                        className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50">Cancel request</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-950">Open requests from other nurseries</h2>
            <p className="mt-1 text-sm text-gray-600">Offer stock you have available. Your offer stays pending — and does not count as committed supply — until the requesting nursery accepts it.</p>
            {openRequests.length === 0 && <p className="mt-4 rounded-2xl border border-dashed border-green-900/20 px-5 py-6 text-center text-gray-600">No open requests from other nurseries right now.</p>}
            <div className="mt-4 space-y-4">
              {openRequests.map((request) => {
                const values = offerForms[request.id] ?? emptyOfferForm;
                const myPending = (request.offers ?? []).find((offer) => offer.status === 'PENDING');
                return (
                  <article key={request.id} className="card p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-green-950">
                          {request.plant_name}{request.species ? ` (${request.species})` : ''} — {request.requester_nursery?.name || 'Another nursery'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">Needed by {request.needed_by} · {request.area}</p>
                        {request.requirements && <p className="mt-1 text-sm text-gray-600">Requirements: {request.requirements}</p>}
                        {request.notes && <p className="mt-1 text-sm text-gray-600">{request.notes}</p>}
                      </div>
                      <span className={`${statusPillBase} ${statusPillClass(request.status)}`}>{statusLabel(request.status)}</span>
                    </div>
                    <Breakdown request={request} />
                    {myPending ? (
                      <>
                        <p className="mt-3 text-sm text-gray-700">
                          Your pending offer: {myPending.quantity} plants at {formatMoney(myPending.unit_price)} each. You can withdraw it from “My offers” below.
                        </p>
                        <div className="mt-3">
                          <MessageButton token={session.token} refType="SUPPLY_GAP_REQUEST" refId={request.id} label="Message requester" />
                        </div>
                      </>
                    ) : (
                      <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-3xl"
                        onSubmit={(event) => { event.preventDefault(); void submitOffer(request); }}>
                        <label className="label">Quantity offered (plants)
                          <input required type="number" min="1" step="1" value={values.quantity}
                            onChange={(event) => setOfferField(request.id, 'quantity', event.target.value)} className={inputClass} />
                        </label>
                        <label className="label">Unit price (PKR)
                          <input required type="number" min="0.01" step="0.01" value={values.unitPrice}
                            onChange={(event) => setOfferField(request.id, 'unitPrice', event.target.value)} className={inputClass} />
                        </label>
                        <label className="label">Availability / condition
                          <input required type="text" maxLength={500} value={values.availabilityCondition} placeholder="e.g. Ready now, 3-4 ft, in grow bags"
                            onChange={(event) => setOfferField(request.id, 'availabilityCondition', event.target.value)} className={inputClass} />
                        </label>
                        <label className="label">Delivery arrangement
                          <input required type="text" maxLength={500} value={values.deliveryArrangement} placeholder="e.g. We deliver within 3 days"
                            onChange={(event) => setOfferField(request.id, 'deliveryArrangement', event.target.value)} className={inputClass} />
                        </label>
                        <label className="label sm:col-span-2">Notes (optional)
                          <input type="text" maxLength={2000} value={values.notes}
                            onChange={(event) => setOfferField(request.id, 'notes', event.target.value)} className={inputClass} />
                        </label>
                        <div className="sm:col-span-2">
                          <button disabled={saving} className="btn-primary px-3 py-1.5 text-sm">Submit offer</button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-950">My offers</h2>
            {myOffers.length === 0 && <p className="mt-4 rounded-2xl border border-dashed border-green-900/20 px-5 py-6 text-center text-gray-600">You have not offered stock on any request yet.</p>}
            <div className="mt-4 space-y-4">
              {myOffers.map((offer) => (
                <article key={offer.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-green-950">{offer.request?.plant_name || 'Supply gap request'}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {offer.quantity} plants at {formatMoney(offer.unit_price)} each
                        {offer.request?.area ? ` · ${offer.request.area}` : ''}
                        {offer.request?.needed_by ? ` · needed by ${offer.request.needed_by}` : ''}
                      </p>
                      <p className="text-sm text-gray-600">Availability: {offer.availability_condition}</p>
                      <p className="text-sm text-gray-600">Delivery: {offer.delivery_arrangement}</p>
                      {offer.status === 'ACCEPTED' && (
                        <p className="mt-1 text-sm text-gray-600">Accepted: this is committed supply, not proof of delivery. Coordinate delivery and payment with the requesting nursery directly.</p>
                      )}
                    </div>
                    <span className={`${statusPillBase} ${statusPillClass(offer.status)}`}>{statusLabel(offer.status)}</span>
                  </div>
                  <div className="mt-3">
                    <MessageButton token={session.token} refType="SUPPLY_GAP_REQUEST" refId={offer.request_id} label="Message requester" />
                  </div>
                  {offer.status === 'PENDING' && (
                    <div className="mt-3">
                      <button type="button" disabled={saving}
                        onClick={() => void runAction(() => withdrawSupplyOffer(session.token, offer.id), 'Offer withdrawn. It no longer counts toward this request.')}
                        className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50">Withdraw offer</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default CollaborationPage;
