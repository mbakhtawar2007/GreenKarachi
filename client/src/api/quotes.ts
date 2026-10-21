import { apiFetch } from './catalog';

export type QuoteRequestStatus = 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
export type OrderStatus = 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';

export type Quotation = {
  id: string;
  quote_request_id: string;
  unit_price: string | number;
  quantity: number;
  delivery_charge: string | number;
  terms: string | null;
  valid_until: string;
  status: 'ACTIVE' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';
};

export type QuoteRequest = {
  id: string;
  buyer_user_id: string;
  nursery_user_id: string;
  listing_id: string;
  quantity: number;
  delivery_area: string;
  delivery_date: string;
  notes: string | null;
  status: QuoteRequestStatus;
  created_at: string;
  quotation?: Quotation | null;
  listing?: { name?: string; species?: string | null; category?: string; unit_price?: string | number } | null;
};

export type OrderItem = {
  id?: string;
  listing_id: string | null;
  plant_name: string;
  unit_price: string | number;
  quantity: number;
  line_total: string | number;
};

export type Order = {
  id: string;
  quote_request_id: string;
  buyer_user_id: string;
  nursery_user_id: string;
  status: OrderStatus;
  plant_name: string;
  unit_price: string | number;
  quantity: number;
  delivery_charge: string | number;
  subtotal: string | number;
  total: string | number;
  delivery_area: string;
  delivery_date: string;
  terms: string | null;
  created_at: string;
  items?: OrderItem[];
};

export type QuoteRequestInput = {
  listingId: string;
  quantity: number;
  deliveryArea: string;
  deliveryDate: string;
  notes: string;
  idempotencyKey?: string;
};

export type QuotationInput = {
  unitPrice: number;
  quantity: number;
  deliveryCharge: number;
  terms: string;
  validUntil: string;
};

export const createQuoteRequest = (token: string, input: QuoteRequestInput) =>
  apiFetch<{ quoteRequest: QuoteRequest }>('/api/quotes/requests', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const getMyQuoteRequests = (token: string) =>
  apiFetch<{ quoteRequests: QuoteRequest[] }>('/api/quotes/requests/mine', token);

export const getIncomingQuoteRequests = (token: string) =>
  apiFetch<{ quoteRequests: QuoteRequest[] }>('/api/quotes/requests/incoming', token);

export const respondWithQuotation = (token: string, requestId: string, input: QuotationInput) =>
  apiFetch<{ quotation: Quotation }>(`/api/quotes/requests/${requestId}/quotation`, token, {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const acceptQuotation = (token: string, requestId: string) =>
  apiFetch<{ order: Order }>(`/api/quotes/requests/${requestId}/accept`, token, { method: 'POST' });

export const declineQuotation = (token: string, requestId: string) =>
  apiFetch<{ quoteRequest: QuoteRequest }>(`/api/quotes/requests/${requestId}/decline`, token, { method: 'POST' });

export const cancelQuoteRequest = (token: string, requestId: string) =>
  apiFetch<{ quoteRequest: QuoteRequest }>(`/api/quotes/requests/${requestId}/cancel`, token, { method: 'POST' });

export const declineQuoteRequest = (token: string, requestId: string) =>
  apiFetch<{ quoteRequest: QuoteRequest }>(`/api/quotes/requests/${requestId}/decline-request`, token, { method: 'POST' });

export const getMyOrders = (token: string) =>
  apiFetch<{ orders: Order[] }>('/api/quotes/orders/mine', token);

export const getIncomingOrders = (token: string) =>
  apiFetch<{ orders: Order[] }>('/api/quotes/orders/incoming', token, { method: 'GET' });

export const changeOrderStatus = (token: string, orderId: string, status: 'FULFILLED' | 'CANCELLED') =>
  apiFetch<{ order: Order }>(`/api/quotes/orders/${orderId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
