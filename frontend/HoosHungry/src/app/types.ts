export type UserRole = "Seller" | "Buyer";
export type OfferStatus = "Pending" | "Accepted" | "Declined";
export type OrderStatus =
  | "AwaitingConfirmation"
  | "Preparing"
  | "ReadySoon"
  | "ReadyForPickup"
  | "Completed"
  | "Declined";

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mealExchangeAvailable: boolean;
  walletBalance: number;
  headline: string;
}

export interface OfferRecord {
  id: string;
  requestGroupId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  item: string;
  location: string;
  price: number;
  status: OfferStatus;
  createdAtUtc: string;
}

export interface TrackingEvent {
  id: string;
  status: OrderStatus;
  label: string;
  detail: string;
  createdAtUtc: string;
  estimatedReadyAtUtc?: string | null;
}

export interface OrderRecord {
  id: string;
  offerId: string;
  requestGroupId: string;
  invoiceId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  item: string;
  location: string;
  offeredPrice: number;
  grubhubConfirmed: boolean;
  fundsReleasedToSeller: boolean;
  status: OrderStatus;
  createdAtUtc: string;
  estimatedReadyAtUtc?: string | null;
  trackingEvents: TrackingEvent[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  actionType?: string | null;
  actionTargetId?: string | null;
  createdAtUtc: string;
}

export interface WithdrawalRecord {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  createdAtUtc: string;
}

export interface DemoMetrics {
  availableSellerCount: number;
  pendingOfferCount: number;
  activeOrderCount: number;
  sellerWalletTotal: number;
  platformEscrowTotal: number;
}

export interface MarketplaceDashboardState {
  sellers: UserAccount[];
  buyers: UserAccount[];
  offers: OfferRecord[];
  orders: OrderRecord[];
  notifications: NotificationItem[];
  withdrawals: WithdrawalRecord[];
  metrics: DemoMetrics;
}

export interface BuyerRequestSummary {
  id: string;
  requestGroupId: string;
  item: string;
  location: string;
  price: number;
  statusLabel: string;
  sellerName?: string;
  exchangeId?: string;
}
