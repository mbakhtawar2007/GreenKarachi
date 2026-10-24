export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

export type PlantListing = {
  id: string;
  name: string;
  species: string | null;
  category: string;
  description: string | null;
  image_urls: string[];
  height: string | null;
  unit_price: string | number;
  available_quantity: number;
  minimum_order_quantity: number;
  service_area: string | null;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
  nursery?: {
    name?: string;
    city?: string | null;
    address?: string | null;
    is_verified?: boolean;
    verification_status?: string;
  };
};

export type ListingInput = {
  name: string;
  species: string;
  category: string;
  description: string;
  imageUrls: string[];
  height: string;
  unitPrice: number;
  availableQuantity: number;
  minimumOrderQuantity: number;
  serviceArea: string;
};

export async function apiFetch<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // An authenticated call rejected as unauthorized means the session token
    // is invalid or expired: drop the stored session and send the user back
    // to sign in instead of leaving every page showing an error banner.
    // Unauthenticated (public) calls are untouched, and we never redirect
    // while already on the login page.
    if (response.status === 401 && token && window.location.pathname !== '/login') {
      try {
        localStorage.removeItem('greenkarachi-session');
      } catch {
        // Storage unavailable: the redirect below still ends the session view.
      }
      window.location.assign('/login?session=expired');
    }
    throw new Error(payload.message || 'The request could not be completed.');
  }
  return payload as T;
}