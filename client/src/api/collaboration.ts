import { apiFetch } from './catalog';

export type SupplyGapRequestStatus = 'OPEN' | 'FULFILLED' | 'CLOSED' | 'CANCELLED';
export type SupplyOfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type SupplyOffer = {
  id: string;
  request_id: string;
  supplier_user_id: string;
  quantity: number;
  unit_price: string | number;
  availability_condition: string;
  delivery_arrangement: string;
  notes: string | null;
  status: SupplyOfferStatus;
  created_at: string;
  supplier_nursery?: { name?: string; city?: string | null } | null;
  request?: {
    plant_name?: string;
    species?: string | null;
    area?: string;
    needed_by?: string;
    status?: SupplyGapRequestStatus;
    quantity_needed?: number;
    committed_quantity?: number;
  } | null;
};

// Quantity breakdown for a request. Only ACCEPTED offers count as committed
// supply; committed supply is a promise between nurseries, not proof that
// plants were delivered.
export type SupplyGapSummary = {
  quantity_needed: number;
  offered_quantity: number;
  committed_quantity: number;
  remaining_gap: number;
};

export type SupplyGapRequest = {
  id: string;
  requester_user_id: string;
  plant_name: string;
  species: string | null;
  total_required: number;
  stock_available: number;
  quantity_needed: number;
  committed_quantity: number;
  requirements: string | null;
  needed_by: string;
  area: string;
  notes: string | null;
  status: SupplyGapRequestStatus;
  created_at: string;
  requester_nursery?: { name?: string; city?: string | null } | null;
  offers?: SupplyOffer[];
  summary?: SupplyGapSummary;
};

export type SupplyGapRequestInput = {
  plantName: string;
  species: string;
  totalRequired: number;
  stockAvailable: number;
  requirements: string;
  neededBy: string;
  area: string;
  notes: string;
};

export type SupplyOfferInput = {
  quantity: number;
  unitPrice: number;
  availabilityCondition: string;
  deliveryArrangement: string;
  notes: string;
};

export const createSupplyGapRequest = (token: string, input: SupplyGapRequestInput) =>
  apiFetch<{ supplyGapRequest: SupplyGapRequest }>('/api/collaboration/requests', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const updateSupplyGapRequest = (token: string, requestId: string, input: SupplyGapRequestInput) =>
  apiFetch<{ supplyGapRequest: SupplyGapRequest }>(`/api/collaboration/requests/${requestId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

export const getMySupplyGapRequests = (token: string) =>
  apiFetch<{ supplyGapRequests: SupplyGapRequest[] }>('/api/collaboration/requests/mine', token);

export const getOpenSupplyGapRequests = (token: string) =>
  apiFetch<{ supplyGapRequests: SupplyGapRequest[] }>('/api/collaboration/requests/open', token);

export const changeSupplyGapRequestStatus = (token: string, requestId: string, status: 'CLOSED' | 'CANCELLED') =>
  apiFetch<{ supplyGapRequest: SupplyGapRequest }>(`/api/collaboration/requests/${requestId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

export const submitSupplyOffer = (token: string, requestId: string, input: SupplyOfferInput) =>
  apiFetch<{ supplyOffer: SupplyOffer }>(`/api/collaboration/requests/${requestId}/offers`, token, {
    method: 'POST',
    body: JSON.stringify(input)
  });

export const getMySupplyOffers = (token: string) =>
  apiFetch<{ supplyOffers: SupplyOffer[] }>('/api/collaboration/offers/mine', token);

export const acceptSupplyOffer = (token: string, offerId: string) =>
  apiFetch<{ offer: SupplyOffer; request: SupplyGapRequest }>(`/api/collaboration/offers/${offerId}/accept`, token, { method: 'POST' });

export const rejectSupplyOffer = (token: string, offerId: string) =>
  apiFetch<{ offer: SupplyOffer; request: SupplyGapRequest }>(`/api/collaboration/offers/${offerId}/reject`, token, { method: 'POST' });

export const withdrawSupplyOffer = (token: string, offerId: string) =>
  apiFetch<{ offer: SupplyOffer; request: SupplyGapRequest }>(`/api/collaboration/offers/${offerId}/withdraw`, token, { method: 'POST' });
