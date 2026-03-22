import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  confirmOrder,
  createOffer,
  decideOffer,
  loadDashboardState,
  setSellingAvailability,
  updateOrderTracking,
  withdrawFunds,
} from "./api";
import AuthScreen, { type AuthUser } from "./components/AuthScreen";
import BuyerDashboard from "./components/BuyerDashboard";
import ExchangeView from "./components/ExchangeView";
import HomePage from "./components/HomePage";
import ProfilePage from "./components/ProfilePage";
import RoleSelection from "./components/RoleSelection";
import SellerDashboard from "./components/SellerDashboard";
import { Toaster } from "./components/ui/sonner";
import type {
  BuyerRequestSummary,
  MarketplaceDashboardState,
  OrderRecord,
  OrderStatus,
  UserAccount,
} from "./types";

type Screen =
  | "home"
  | "auth"
  | "profile"
  | "role-selection"
  | "buyer"
  | "seller"
  | "exchange";

function findUserInState(
  state: MarketplaceDashboardState,
  userId: string,
): UserAccount | null {
  return (
    [...state.sellers, ...state.buyers].find(
      (user) => user.id === userId,
    ) ?? null
  );
}

function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case "AwaitingConfirmation":
      return "Awaiting Confirmation";
    case "ReadySoon":
      return "Ready Soon";
    case "ReadyForPickup":
      return "Ready for Pickup";
    default:
      return status;
  }
}

function buildBuyerRequestSummaries(
  state: MarketplaceDashboardState,
  buyerId: string,
): BuyerRequestSummary[] {
  const grouped = new Map<
    string,
    {
      id: string;
      requestGroupId: string;
      item: string;
      location: string;
      price: number;
      createdAt: number;
    }
  >();

  for (const order of state.orders) {
    if (order.buyerId !== buyerId) {
      continue;
    }

    grouped.set(order.requestGroupId, {
      id: order.requestGroupId,
      requestGroupId: order.requestGroupId,
      item: order.item,
      location: order.location,
      price: order.offeredPrice,
      createdAt: Date.parse(order.createdAtUtc),
    });
  }

  for (const offer of state.offers) {
    if (offer.buyerId !== buyerId || grouped.has(offer.requestGroupId)) {
      continue;
    }

    grouped.set(offer.requestGroupId, {
      id: offer.requestGroupId,
      requestGroupId: offer.requestGroupId,
      item: offer.item,
      location: offer.location,
      price: offer.price,
      createdAt: Date.parse(offer.createdAtUtc),
    });
  }

  return Array.from(grouped.values())
    .map((group) => {
      const matchingOrder = state.orders.find(
        (order) =>
          order.buyerId === buyerId &&
          order.requestGroupId === group.requestGroupId,
      );

      if (matchingOrder) {
        return {
          id: group.id,
          requestGroupId: group.requestGroupId,
          item: group.item,
          location: group.location,
          price: group.price,
          statusLabel: formatOrderStatus(matchingOrder.status),
          sellerName: matchingOrder.sellerName,
          exchangeId: matchingOrder.id,
          createdAt: group.createdAt,
        };
      }

      const relatedOffers = state.offers.filter(
        (offer) =>
          offer.buyerId === buyerId &&
          offer.requestGroupId === group.requestGroupId,
      );
      const acceptedOffer = relatedOffers.find(
        (offer) => offer.status === "Accepted",
      );
      const hasPendingOffer = relatedOffers.some(
        (offer) => offer.status === "Pending",
      );

      return {
        id: group.id,
        requestGroupId: group.requestGroupId,
        item: group.item,
        location: group.location,
        price: group.price,
        statusLabel: acceptedOffer
          ? "Accepted"
          : hasPendingOffer
            ? "Pending"
            : "Declined",
        sellerName: acceptedOffer?.sellerName,
        createdAt: group.createdAt,
      };
    })
    .sort((left, right) => right.createdAt - left.createdAt)
    .map(({ createdAt: _createdAt, ...summary }) => summary);
}

function sortNewest<T extends { createdAtUtc: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) =>
      Date.parse(right.createdAtUtc) - Date.parse(left.createdAtUtc),
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [previousScreen, setPreviousScreen] =
    useState<Screen>("role-selection");
  const [userRole, setUserRole] = useState<"buyer" | "seller" | null>(
    null,
  );
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    null,
  );
  const [dashboardState, setDashboardState] =
    useState<MarketplaceDashboardState | null>(null);
  const [isStateLoading, setIsStateLoading] = useState(false);
  const [selectedExchangeId, setSelectedExchangeId] = useState<
    string | null
  >(null);

  const applyDashboardState = (state: MarketplaceDashboardState) => {
    setDashboardState(state);
    setCurrentUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      return findUserInState(state, previousUser.id) ?? previousUser;
    });
  };

  useEffect(() => {
    if (!currentUser) {
      setDashboardState(null);
      setIsStateLoading(false);
      return;
    }

    let isActive = true;
    setIsStateLoading(true);

    void loadDashboardState()
      .then((state) => {
        if (!isActive) {
          return;
        }

        applyDashboardState(state);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load marketplace data.",
        );
      })
      .finally(() => {
        if (isActive) {
          setIsStateLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [currentUser?.id]);

  const handleGetStarted = () => {
    setScreen("auth");
  };

  const openProfile = () => {
    if (
      screen === "role-selection" ||
      screen === "buyer" ||
      screen === "seller" ||
      screen === "exchange"
    ) {
      setPreviousScreen(screen);
    }

    setScreen("profile");
  };

  const closeProfile = () => {
    setScreen(previousScreen);
  };

  const handleAuthenticated = (user: AuthUser) => {
    setCurrentUser(user);
    setUserRole(null);
    setSelectedExchangeId(null);
    setScreen("role-selection");
    toast.success(`Signed in as ${user.name}.`);
  };

  const handleSetSellingMode = async (nextValue: boolean) => {
    if (!currentUser) {
      return;
    }

    try {
      const nextState = await setSellingAvailability(
        currentUser.id,
        nextValue,
      );
      applyDashboardState(nextState);
      toast.success(
        nextValue
          ? "Selling mode is live."
          : "Selling mode is paused.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update selling mode.";
      toast.error(message);
      throw error;
    }
  };

  const handleSelectRole = (role: "buyer" | "seller") => {
    setUserRole(role);
    setScreen(role);
  };

  const handleCreateRequest = (request: {
    item: string;
    price: number;
    location: string;
  }) => {
    if (!currentUser) {
      return;
    }

    void createOffer({
      buyerId: currentUser.id,
      item: request.item,
      location: request.location,
      price: request.price,
    })
      .then((nextState) => {
        applyDashboardState(nextState);
        toast.success("Request sent to available sellers.");
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to create request.",
        );
      });
  };

  const handleAcceptRequest = (offerId: string) => {
    void decideOffer(offerId, true)
      .then((nextState) => {
        applyDashboardState(nextState);
        toast.success("Request accepted.");
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to accept request.",
        );
      });
  };

  const handleDeclineRequest = (offerId: string) => {
    void decideOffer(offerId, false)
      .then((nextState) => {
        applyDashboardState(nextState);
        toast.success("Request declined.");
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to decline request.",
        );
      });
  };

  const handleViewExchange = (exchangeId: string) => {
    setSelectedExchangeId(exchangeId);
    setScreen("exchange");
  };

  const handleBackFromExchange = () => {
    setSelectedExchangeId(null);
    setScreen(userRole ?? "role-selection");
  };

  const handleBackToRoleSelection = () => {
    setSelectedExchangeId(null);
    setScreen("role-selection");
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const nextState = await confirmOrder(orderId);
      applyDashboardState(nextState);
      toast.success("Order confirmed.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to confirm order.";
      toast.error(message);
      throw error;
    }
  };

  const handleUpdateTracking = async (
    orderId: string,
    status: OrderStatus,
    detail: string,
    estimatedReadyAtUtc?: string | null,
  ) => {
    try {
      const nextState = await updateOrderTracking(
        orderId,
        status,
        detail,
        estimatedReadyAtUtc,
      );
      applyDashboardState(nextState);
      toast.success(
        status === "Completed"
          ? "Exchange marked complete."
          : "Tracking updated.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update tracking.";
      toast.error(message);
      throw error;
    }
  };

  const handleWithdraw = async (amount: number) => {
    if (!currentUser) {
      return;
    }

    try {
      const nextState = await withdrawFunds(currentUser.id, amount);
      applyDashboardState(nextState);
      toast.success(`Withdrawal requested for $${amount.toFixed(2)}.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to withdraw funds.";
      toast.error(message);
      throw error;
    }
  };

  const currentUserId = currentUser?.id ?? "";
  const currentUserState = currentUserId
    ? findUserInState(dashboardState ?? {
        sellers: [],
        buyers: [],
        offers: [],
        orders: [],
        notifications: [],
        withdrawals: [],
        metrics: {
          availableSellerCount: 0,
          pendingOfferCount: 0,
          activeOrderCount: 0,
          sellerWalletTotal: 0,
          platformEscrowTotal: 0,
        },
      }, currentUserId)
    : null;
  const effectiveUser = currentUserState ?? currentUser;

  const buyerRequests = dashboardState
    ? buildBuyerRequestSummaries(dashboardState, currentUserId)
    : [];
  const availableRequests = dashboardState
    ? sortNewest(
        dashboardState.offers.filter(
          (offer) =>
            offer.sellerId === currentUserId &&
            offer.status === "Pending",
        ),
      )
    : [];
  const myAcceptedRequests = dashboardState
    ? sortNewest(
        dashboardState.orders.filter(
          (order) => order.sellerId === currentUserId,
        ),
      )
    : [];
  const notifications = dashboardState
    ? sortNewest(
        dashboardState.notifications.filter(
          (notification) => notification.userId === currentUserId,
        ),
      )
    : [];
  const withdrawals = dashboardState
    ? sortNewest(
        dashboardState.withdrawals.filter(
          (withdrawal) => withdrawal.sellerId === currentUserId,
        ),
      )
    : [];
  const selectedExchange: OrderRecord | null =
    dashboardState?.orders.find(
      (order) => order.id === selectedExchangeId,
    ) ?? null;

  const showLoadingState =
    !!currentUser &&
    isStateLoading &&
    !dashboardState &&
    screen !== "home" &&
    screen !== "auth";

  return (
    <>
      <Toaster />
      <div className="size-full">
        {screen === "home" && (
          <HomePage onGetStarted={handleGetStarted} />
        )}

        {screen === "auth" && (
          <AuthScreen
            onAuthenticated={handleAuthenticated}
            onBack={() => setScreen("home")}
          />
        )}

        {showLoadingState && (
          <div className="flex min-h-screen items-center justify-center bg-[#efefef] px-6">
            <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
              <h1 className="text-xl font-bold">Loading marketplace</h1>
              <p className="mt-2 text-sm text-gray-600">
                Pulling the latest buyer, seller, and exchange state.
              </p>
            </div>
          </div>
        )}

        {!showLoadingState &&
          screen === "profile" &&
          effectiveUser && (
            <ProfilePage
              notifications={notifications}
              onBack={closeProfile}
              onProfileClick={openProfile}
              onSetSellingMode={handleSetSellingMode}
              onWithdraw={handleWithdraw}
              user={effectiveUser}
              withdrawals={withdrawals}
            />
          )}

        {!showLoadingState && screen === "role-selection" && (
          <RoleSelection
            onProfileClick={openProfile}
            onSelectRole={handleSelectRole}
          />
        )}

        {!showLoadingState && screen === "buyer" && (
          <BuyerDashboard
            activeRequests={buyerRequests}
            onBack={handleBackToRoleSelection}
            onCreateRequest={handleCreateRequest}
            onProfileClick={openProfile}
            onViewExchange={handleViewExchange}
          />
        )}

        {!showLoadingState && screen === "seller" && (
          <SellerDashboard
            availableRequests={availableRequests}
            balance={effectiveUser?.walletBalance ?? 0}
            isSellingModeEnabled={
              effectiveUser?.mealExchangeAvailable ?? false
            }
            myAcceptedRequests={myAcceptedRequests}
            onAcceptRequest={handleAcceptRequest}
            onBack={handleBackToRoleSelection}
            onDeclineRequest={handleDeclineRequest}
            onProfileClick={openProfile}
            onSetSellingMode={handleSetSellingMode}
            onViewExchange={handleViewExchange}
          />
        )}

        {!showLoadingState &&
          screen === "exchange" &&
          selectedExchange &&
          userRole && (
            <ExchangeView
              exchange={selectedExchange}
              onBack={handleBackFromExchange}
              onConfirmOrder={handleConfirmOrder}
              onProfileClick={openProfile}
              onUpdateTracking={handleUpdateTracking}
              userRole={userRole}
            />
          )}
      </div>
    </>
  );
}
