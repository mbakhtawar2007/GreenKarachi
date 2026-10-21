import React from 'react';
import { apiFetch, type PlantListing } from '../api/catalog';
import {
  acceptQuotation,
  cancelQuoteRequest,
  changeOrderStatus,
  createQuoteRequest,
  declineQuotation,
  declineQuoteRequest,
  getIncomingOrders,
  getIncomingQuoteRequests,
  getMyOrders,
  getMyQuoteRequests,
  respondWithQuotation,
  type Order,
  type QuoteRequest
} from '../api/quotes';
import type { AuthSession } from '../App';
import MessageButton from '../components/MessageButton';

const currency = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 });
const formatMoney = (value: string | number) => currency.format(Number(value));
const formatDateTime = (value: string) => new Date(value).toLocaleString('en-PK');

const statusLabel = (status: string) => status.replaceAll('_', ' ');

const QuotesOrdersPage: React.FC<{ session: AuthSession }> = ({ session }) => {
  const isBuyer = session.user.roles.includes('BUYER');
  const isNursery = session.user.roles.includes('NURSERY_OWNER');

  const [listings, setListings] = React.useState<PlantListing[]>([]);
  const [myRequests, setMyRequests] = React.useState<QuoteRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = React.useState<QuoteRequest[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const [form, setForm] = React.useState({ listingId: '', quantity: 10, deliveryArea: '', deliveryDate: '', notes: '' });
  const idempotencyKey = React.useRef<string>(crypto.randomUUID());
  const [quoteForms, setQuoteForms] = React.useState<Record<string, { unitPrice: string; quantity: string; deliveryCharge: string; terms: string; validityDays: string }>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const jobs: Promise<unknown>[] = [];
      if (isBuyer) {
        jobs.push(
          apiFetch<{ listings: PlantListing[] }>('/api/catalog/listings?pageSize=50').then((data) => setListings(data.listings)),
          getMyQuoteRequests(session.token).then((data) => setMyRequests(data.quoteRequests)),
          getMyOrders(session.token).then((data) => setOrders(data.orders))
        );
      }
      if (isNursery) {
        jobs.push(
          getIncomingQuoteRequests(session.token).then((data) => setIncomingRequests(data.quoteRequests)),
          getIncomingOrders(session.token).then((data) => setOrders(data.orders))
        );
      }
      await Promise.all(jobs);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load quotes and orders.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void loadData(); }, [session.token]);

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

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(async () => {
      await createQuoteRequest(session.token, {
        listingId: form.listingId,
        quantity: Number(form.quantity),
        deliveryArea: form.deliveryArea,
        deliveryDate: form.deliveryDate,
        notes: form.notes,
        idempotencyKey: idempotencyKey.current
      });
      idempotencyKey.current = crypto.randomUUID();
      setForm({ listingId: '', quantity: 10, deliveryArea: '', deliveryDate: '', notes: '' });
    }, 'Quote request sent. This is not an accepted order yet — the nursery still has to respond with a quotation.');
  };

  const submitQuotation = async (request: QuoteRequest) => {
    const values = quoteForms[request.id] ?? {
      unitPrice: String(Number(request.listing?.unit_price ?? 0)),
      quantity: String(request.quantity),
      deliveryCharge: '0',
      terms: '',
      validityDays: '7'
    };
    const validUntil = new Date(Date.now() + Number(values.validityDays || 7) * 24 * 60 * 60 * 1000).toISOString();
    await runAction(
      () => respondWithQuotation(session.token, request.id, {
        unitPrice: Number(values.unitPrice),
        quantity: Number(values.quantity),
        deliveryCharge: Number(values.deliveryCharge),
        terms: values.terms,
        validUntil
      }),
      'Quotation sent to the buyer.'
    );
  };

  const setQuoteField = (requestId: string, key: string, value: string) =>
    setQuoteForms((current) => {
      const existing = current[requestId] ?? { unitPrice: '', quantity: '', deliveryCharge: '0', terms: '', validityDays: '7' };
      return { ...current, [requestId]: { ...existing, [key]: value } };
    });

  const quotationOf = (request: QuoteRequest) => (Array.isArray(request.quotation) ? request.quotation[0] : request.quotation) ?? null;

  return (
    <section className="py-8 md:py-12">
      <header className="mb-8 border-b border-green-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Quotes and orders</p>
        <h1 className="mt-2 text-3xl font-bold text-green-950">Quotation requests &amp; orders</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          A quote request is <strong>not</strong> an accepted order. An order is created only when a buyer accepts a
          nursery quotation, and it keeps a snapshot of the agreed price, quantity, and terms. GreenKarachi does not
          process or claim any payment — payment is arranged directly between buyer and nursery.
        </p>
      </header>

      {error && <p className="mb-4 border-l-4 border-red-700 bg-red-50 p-3 text-red-900" role="alert">{error}</p>}
      {message && <p className="mb-4 border-l-4 border-green-700 bg-green-50 p-3 text-green-950" role="status">{message}</p>}
      {loading && <p className="py-6 text-gray-600" role="status">Loading quotes and orders...</p>}

      {!loading && isBuyer && (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section>
            <h2 className="text-xl font-semibold text-green-950">Request a quotation</h2>
            <form onSubmit={submitRequest} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-gray-700">Plant listing
                <select required value={form.listingId} onChange={(event) => setForm((current) => ({ ...current, listingId: event.target.value }))}
                  className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200">
                  <option value="">Select a listing</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.name} — {formatMoney(listing.unit_price)} per plant, {listing.available_quantity} available
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">Quantity (plants)
                  <input required type="number" min="1" step="1" value={form.quantity}
                    onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
                </label>
                <label className="text-sm font-medium text-gray-700">Delivery date
                  <input required type="date" value={form.deliveryDate}
                    onChange={(event) => setForm((current) => ({ ...current, deliveryDate: event.target.value }))}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">Delivery area
                <input required type="text" maxLength={160} value={form.deliveryArea} placeholder="e.g. Clifton, Karachi"
                  onChange={(event) => setForm((current) => ({ ...current, deliveryArea: event.target.value }))}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Notes (optional)
                <textarea rows={3} maxLength={2000} value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
              </label>
              <button disabled={saving} className="rounded bg-green-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {saving ? 'Sending...' : 'Send quote request'}
              </button>
            </form>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-green-950">My quote requests</h2>
            {myRequests.length === 0 && <p className="border-y border-green-200 py-6 text-gray-600">No quote requests yet.</p>}
            <div className="mt-4 divide-y divide-green-200">
              {myRequests.map((request) => {
                const quotation = quotationOf(request);
                const expired = quotation ? new Date(quotation.valid_until).getTime() <= Date.now() : false;
                return (
                  <article key={request.id} className="py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-green-950">{request.listing?.name || 'Plant listing'}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {request.quantity} plants · Deliver to {request.delivery_area} by {request.delivery_date}
                        </p>
                        {request.notes && <p className="mt-1 text-sm text-gray-600">{request.notes}</p>}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{statusLabel(request.status)}</span>
                    </div>
                    {quotation && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><dt className="text-gray-500">Quoted unit price</dt><dd className="font-semibold">{formatMoney(quotation.unit_price)}</dd></div>
                        <div><dt className="text-gray-500">Quoted quantity</dt><dd className="font-semibold">{quotation.quantity} plants</dd></div>
                        <div><dt className="text-gray-500">Delivery charge</dt><dd className="font-semibold">{formatMoney(quotation.delivery_charge)}</dd></div>
                        <div><dt className="text-gray-500">Valid until</dt><dd className="font-semibold">{formatDateTime(quotation.valid_until)}{expired ? ' (expired)' : ''}</dd></div>
                        {quotation.terms && <div className="col-span-2"><dt className="text-gray-500">Terms</dt><dd>{quotation.terms}</dd></div>}
                      </dl>
                    )}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <MessageButton token={session.token} refType="QUOTE_REQUEST" refId={request.id} label="Message nursery" />
                      {request.status === 'QUOTED' && quotation && !expired && (
                        <button type="button" disabled={saving} onClick={() => void runAction(() => acceptQuotation(session.token, request.id), 'Order confirmed. The agreed price, quantity, and terms are saved on the order. No payment has been taken.')}
                          className="rounded bg-green-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Accept quotation &amp; create order</button>
                      )}
                      {request.status === 'QUOTED' && (
                        <button type="button" disabled={saving} onClick={() => void runAction(() => declineQuotation(session.token, request.id), 'Quotation declined.')}
                          className="rounded border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50">Decline</button>
                      )}
                      {(request.status === 'PENDING' || request.status === 'QUOTED') && (
                        <button type="button" disabled={saving} onClick={() => void runAction(() => cancelQuoteRequest(session.token, request.id), 'Quote request cancelled.')}
                          className="rounded border border-red-700 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">Cancel request</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {!loading && isNursery && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-green-950">Incoming quote requests</h2>
          {incomingRequests.length === 0 && <p className="border-y border-green-200 py-6 text-gray-600">No quote requests for your nursery yet.</p>}
          <div className="mt-4 divide-y divide-green-200">
            {incomingRequests.map((request) => {
              const quotation = quotationOf(request);
              const values = quoteForms[request.id] ?? {
                unitPrice: String(Number(request.listing?.unit_price ?? 0) || ''),
                quantity: String(request.quantity),
                deliveryCharge: '0',
                terms: '',
                validityDays: '7'
              };
              return (
                <article key={request.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-green-950">{request.listing?.name || 'Plant listing'}</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {request.quantity} plants requested · Deliver to {request.delivery_area} by {request.delivery_date}
                      </p>
                      {request.notes && <p className="mt-1 text-sm text-gray-600">Buyer notes: {request.notes}</p>}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{statusLabel(request.status)}</span>
                  </div>
                  {quotation && (
                    <p className="mt-2 text-sm text-gray-700">
                      Your quotation: {formatMoney(quotation.unit_price)} × {quotation.quantity} plants, delivery {formatMoney(quotation.delivery_charge)}, valid until {formatDateTime(quotation.valid_until)}.
                    </p>
                  )}
                  <div className="mt-3">
                    <MessageButton token={session.token} refType="QUOTE_REQUEST" refId={request.id} label="Message buyer" />
                  </div>
                  {request.status === 'PENDING' && (
                    <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => { event.preventDefault(); void submitQuotation(request); }}>
                      {([
                        ['unitPrice', 'Unit price (PKR)', '0.01'],
                        ['quantity', 'Quantity offered', '1'],
                        ['deliveryCharge', 'Delivery charge (PKR)', '0.01'],
                        ['validityDays', 'Valid for (days)', '1']
                      ] as const).map(([key, label, step]) => (
                        <label key={key} className="text-sm font-medium text-gray-700">{label}
                          <input required type="number" min={key === 'quantity' || key === 'validityDays' ? '1' : '0'} step={step} value={values[key]}
                            onChange={(event) => setQuoteField(request.id, key, event.target.value)}
                            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
                        </label>
                      ))}
                      <label className="text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-5">Terms (optional)
                        <input type="text" maxLength={2000} value={values.terms}
                          onChange={(event) => setQuoteField(request.id, 'terms', event.target.value)}
                          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200" />
                      </label>
                      <div className="flex gap-3 sm:col-span-2 lg:col-span-5">
                        <button disabled={saving} className="rounded bg-green-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Send quotation</button>
                        <button type="button" disabled={saving} onClick={() => void runAction(() => declineQuoteRequest(session.token, request.id), 'Quote request declined.')}
                          className="rounded border border-red-700 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">Decline request</button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!loading && (isBuyer || isNursery) && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-green-950">{isNursery && !isBuyer ? 'Orders to fulfil' : 'My orders'}</h2>
          <p className="mt-1 text-sm text-gray-600">Order terms below are snapshots agreed at acceptance. No payment has been processed by GreenKarachi for any order.</p>
          {orders.length === 0 && <p className="border-y border-green-200 py-6 text-gray-600">No orders yet. An order appears here after a quotation is accepted.</p>}
          <div className="mt-4 divide-y divide-green-200">
            {orders.map((order) => (
              <article key={order.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-green-950">{order.plant_name}</h3>
                    <p className="mt-1 text-sm text-gray-600">Deliver to {order.delivery_area} by {order.delivery_date}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{statusLabel(order.status)}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div><dt className="text-gray-500">Unit price</dt><dd className="font-semibold">{formatMoney(order.unit_price)}</dd></div>
                  <div><dt className="text-gray-500">Quantity</dt><dd className="font-semibold">{order.quantity} plants</dd></div>
                  <div><dt className="text-gray-500">Delivery charge</dt><dd className="font-semibold">{formatMoney(order.delivery_charge)}</dd></div>
                  <div><dt className="text-gray-500">Total (no payment taken)</dt><dd className="font-semibold">{formatMoney(order.total)}</dd></div>
                </dl>
                {order.terms && <p className="mt-2 text-sm text-gray-600">Terms: {order.terms}</p>}
                <div className="mt-3">
                  <MessageButton token={session.token} refType="ORDER" refId={order.id} label="Message about this order" />
                </div>
                {order.status === 'CONFIRMED' && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {isNursery && order.nursery_user_id === session.user.id && (
                      <button type="button" disabled={saving} onClick={() => void runAction(() => changeOrderStatus(session.token, order.id, 'FULFILLED'), 'Order marked as fulfilled.')}
                        className="rounded bg-green-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Mark fulfilled</button>
                    )}
                    <button type="button" disabled={saving} onClick={() => void runAction(() => changeOrderStatus(session.token, order.id, 'CANCELLED'), 'Order cancelled and its reserved stock was released.')}
                      className="rounded border border-red-700 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">Cancel order</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
};

export default QuotesOrdersPage;
