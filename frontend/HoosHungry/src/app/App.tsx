import { useState } from "react";
import HomePage from "./components/HomePage";
import AuthScreen, { type AuthUser } from "./components/AuthScreen";
import RoleSelection from "./components/RoleSelection";
import BuyerDashboard from "./components/BuyerDashboard";
import SellerDashboard from "./components/SellerDashboard";
import ExchangeView from "./components/ExchangeView";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

type Screen =
  | "home"
  | "auth"
  | "role-selection"
  | "buyer"
  | "seller"
  | "exchange";

interface Request {
  id: string;
  item: string;
  price: number;
  location: string;
  buyerName: string;
  sellerId?: string;
  sellerName?: string;
  status:
    | "pending"
    | "matched"
    | "meeting scheduled"
    | "pending confirmation"
    | "completed";
  meetupTime?: string;
  meetupLocation?: string;
  meetupNotes?: string;
  buyerConfirmed?: boolean;
  sellerConfirmed?: boolean;
  createdAt: number;
}

const MOCK_BUYER_NAMES = [
  "Sarah M.",
  "Mike T.",
  "Emily R.",
  "James K.",
  "Lisa P.",
];
const MOCK_SELLER_NAMES = [
  "Alex W.",
  "Jordan S.",
  "Taylor B.",
  "Casey D.",
  "Morgan L.",
];

function generateMockRequests(): Request[] {
  const items = [
    "Burger & Fries",
    "Pizza Slice",
    "Sandwich",
    "Pasta Bowl",
  ];
  const locations = [
    "Newcomb Hall",
    "Observatory Hill Dining",
    "Runk Dining Hall",
  ];
  const requests: Request[] = [];

  for (let i = 0; i < 3; i++) {
    requests.push({
      id: `mock-${i}`,
      item: items[Math.floor(Math.random() * items.length)],
      price: Math.floor(Math.random() * 6) + 5,
      location:
        locations[Math.floor(Math.random() * locations.length)],
      buyerName:
        MOCK_BUYER_NAMES[
          Math.floor(Math.random() * MOCK_BUYER_NAMES.length)
        ],
      status: "pending",
      createdAt: Date.now() - Math.random() * 3600000,
    });
  }

  return requests;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [userRole, setUserRole] = useState<
    "buyer" | "seller" | null
  >(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    null,
  );
  const [requests, setRequests] = useState<Request[]>(
    generateMockRequests(),
  );
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [myAcceptedRequests, setMyAcceptedRequests] = useState<
    Request[]
  >([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<
    string | null
  >(null);
  const [sellerBalance, setSellerBalance] = useState(0);

  const currentUserName = currentUser?.name ?? "You";

  const resetMarketplaceState = () => {
    setRequests(generateMockRequests());
    setMyRequests([]);
    setMyAcceptedRequests([]);
    setSelectedExchangeId(null);
  };

  const handleGetStarted = () => {
    setScreen("auth");
  };

  const handleAuthenticated = (user: AuthUser) => {
    setCurrentUser(user);
    setUserRole(null);
    setSellerBalance(user.walletBalance ?? 0);
    resetMarketplaceState();
    setScreen("role-selection");
    toast.success(
      `Signed in as ${user.name}.`,
    );
  };

  const handleSelectRole = (role: "buyer" | "seller") => {
    setUserRole(role);
    setScreen(role);
  };

  const handleCreateRequest = (requestData: {
    item: string;
    price: number;
    location: string;
  }) => {
    const newRequest: Request = {
      id: `req-${Date.now()}`,
      ...requestData,
      buyerName: currentUserName,
      status: "pending",
      createdAt: Date.now(),
    };

    setMyRequests([...myRequests, newRequest]);
    setRequests([...requests, newRequest]);

    toast.success(
      "Request sent! Waiting for a seller to accept...",
    );

    // Simulate seller accepting after 3 seconds
    setTimeout(() => {
      const sellerName =
        MOCK_SELLER_NAMES[
          Math.floor(Math.random() * MOCK_SELLER_NAMES.length)
        ];
      setMyRequests((prev) =>
        prev.map((r) =>
          r.id === newRequest.id
            ? {
                ...r,
                status: "matched",
                sellerId: "seller-1",
                sellerName,
              }
            : r,
        ),
      );
      toast.success(`Matched with ${sellerName}!`);
    }, 3000);
  };

  const handleAcceptRequest = (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const acceptedRequest: Request = {
      ...request,
      status: "matched",
      sellerId: currentUser?.id ?? "current-user",
      sellerName: currentUserName,
    };

    setMyAcceptedRequests([
      ...myAcceptedRequests,
      acceptedRequest,
    ]);
    setRequests(requests.filter((r) => r.id !== requestId));

    toast.success(`Request accepted! Propose a meeting time.`);
  };

  const handleProposeMeetup = (meetupDetails: {
    time: string;
    location: string;
    notes: string;
  }) => {
    if (!selectedExchangeId) return;

    const updateRequest = (req: Request) => {
      if (req.id === selectedExchangeId) {
        return {
          ...req,
          status: "meeting scheduled" as const,
          meetupTime: meetupDetails.time,
          meetupLocation: meetupDetails.location,
          meetupNotes: meetupDetails.notes,
        };
      }
      return req;
    };

    setMyRequests((prev) => prev.map(updateRequest));
    setMyAcceptedRequests((prev) => prev.map(updateRequest));

    toast.success("Meeting details sent to buyer!");
  };

  const handleConfirmExchange = () => {
    if (!selectedExchangeId) return;

    const updateRequest = (req: Request) => {
      if (req.id === selectedExchangeId) {
        const buyerConfirmed =
          userRole === "buyer" ? true : req.buyerConfirmed;
        const sellerConfirmed =
          userRole === "seller" ? true : req.sellerConfirmed;

        if (buyerConfirmed && sellerConfirmed) {
          // Both confirmed, complete the transaction
          if (userRole === "seller") {
            setSellerBalance((prev) => prev + req.price);
          }
          toast.success(
            "Exchange completed! Payment processed.",
          );
          return {
            ...req,
            status: "completed" as const,
            buyerConfirmed,
            sellerConfirmed,
          };
        } else {
          toast.success(
            "Confirmation received! Waiting for the other person...",
          );
          return {
            ...req,
            status: "pending confirmation" as const,
            buyerConfirmed,
            sellerConfirmed,
          };
        }
      }
      return req;
    };

    setMyRequests((prev) => prev.map(updateRequest));
    setMyAcceptedRequests((prev) => prev.map(updateRequest));
  };

  const handleViewExchange = (exchangeId: string) => {
    setSelectedExchangeId(exchangeId);
    setScreen("exchange");
  };

  const handleBackFromExchange = () => {
    setSelectedExchangeId(null);
    setScreen(userRole!);
  };

  const handleBackToRoleSelection = () => {
    setSelectedExchangeId(null);
    setScreen("role-selection");
  };

  const getSelectedExchange = (): Request | null => {
    if (!selectedExchangeId) return null;
    const allExchanges = [...myRequests, ...myAcceptedRequests];
    return (
      allExchanges.find((r) => r.id === selectedExchangeId) ||
      null
    );
  };

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

        {screen === "role-selection" && (
          <RoleSelection onSelectRole={handleSelectRole} />
        )}

        {screen === "buyer" && (
          <BuyerDashboard
            onBack={handleBackToRoleSelection}
            onCreateRequest={handleCreateRequest}
            activeRequests={myRequests}
            onViewExchange={handleViewExchange}
          />
        )}

        {screen === "seller" && (
          <SellerDashboard
            onBack={handleBackToRoleSelection}
            availableRequests={requests.filter(
              (r) => r.status === "pending",
            )}
            onAcceptRequest={handleAcceptRequest}
            myAcceptedRequests={myAcceptedRequests}
            onViewExchange={handleViewExchange}
            balance={sellerBalance}
          />
        )}

        {screen === "exchange" &&
          selectedExchangeId &&
          getSelectedExchange() && (
            <ExchangeView
              onBack={handleBackFromExchange}
              exchange={getSelectedExchange()!}
              userRole={userRole!}
              onProposeMeetup={handleProposeMeetup}
              onConfirmExchange={handleConfirmExchange}
            />
          )}
      </div>
    </>
  );
}
