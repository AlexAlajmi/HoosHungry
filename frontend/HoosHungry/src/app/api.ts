import type {
  MarketplaceDashboardState,
  OrderStatus,
} from "./types";

const API_BASE = "http://localhost:5009/api";

interface ApiError {
  error?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload =
    ((await response.json().catch(() => null)) as
      | T
      | ApiError
      | null) ?? null;

  if (!response.ok) {
    throw new Error(
      (payload as ApiError | null)?.error ?? "Request failed.",
    );
  }

  return payload as T;
}

export function loadDashboardState() {
  return fetch(`${API_BASE}/demo/state`).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function setSellingAvailability(
  userId: string,
  isAvailable: boolean,
) {
  return fetch(`${API_BASE}/sellers/${userId}/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isAvailable }),
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function dismissNotification(notificationId: string) {
  return fetch(`${API_BASE}/notifications/${notificationId}/dismiss`, {
    method: "POST",
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function createOffer(request: {
  buyerId: string;
  item: string;
  location: string;
  price: number;
}) {
  return fetch(`${API_BASE}/offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function decideOffer(offerId: string, accept: boolean) {
  return fetch(`${API_BASE}/offers/${offerId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accept }),
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function confirmOrder(
  orderId: string,
  confirmationNote = "Seller submitted the meal exchange in mock GrubHub.",
) {
  return fetch(`${API_BASE}/orders/${orderId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmationNote }),
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function completeOrder(
  orderId: string,
  buyerId: string,
  completionNote = "Buyer confirmed the meal exchange pickup.",
) {
  return fetch(`${API_BASE}/orders/${orderId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyerId, completionNote }),
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function updateOrderTracking(
  orderId: string,
  status: OrderStatus,
  detail: string,
  estimatedReadyAtUtc?: string | null,
) {
  return fetch(`${API_BASE}/orders/${orderId}/tracking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, detail, estimatedReadyAtUtc }),
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}

export function withdrawFunds(sellerId: string, amount: number) {
  return fetch(`${API_BASE}/wallets/${sellerId}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  }).then((response) =>
    parseResponse<MarketplaceDashboardState>(response),
  );
}
