import AppNavbar from './AppNavbar';
import SellingModeControl from './SellingModeControl';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, DollarSign } from 'lucide-react';
import type { NotificationItem, OfferRecord, OrderRecord } from '../types';

interface SellerDashboardProps {
  notifications: NotificationItem[];
  onAcceptNotificationOffer: (notificationId: string, offerId: string) => void;
  onBack: () => void;
  onDeclineNotificationOffer: (notificationId: string, offerId: string) => void;
  onDismissNotification: (notificationId: string) => Promise<void>;
  onProfileClick: () => void;
  onOpenNotificationTarget: (notification: NotificationItem) => void;
  onSetSellingMode: (nextValue: boolean) => Promise<void>;
  availableRequests: OfferRecord[];
  isSellingModeEnabled: boolean;
  onAcceptRequest: (requestId: string) => void;
  onDeclineRequest: (requestId: string) => void;
  myAcceptedRequests: OrderRecord[];
  onViewExchange: (exchangeId: string) => void;
  balance: number;
}

export default function SellerDashboard({
  notifications,
  onAcceptNotificationOffer,
  onBack,
  onDeclineNotificationOffer,
  onDismissNotification,
  onProfileClick,
  onOpenNotificationTarget,
  onSetSellingMode,
  availableRequests,
  isSellingModeEnabled,
  onAcceptRequest,
  onDeclineRequest,
  myAcceptedRequests,
  onViewExchange,
  balance
}: SellerDashboardProps) {
  return (
    <div className="min-h-screen bg-[#efefef]">
      <AppNavbar
        notifications={notifications}
        onAcceptNotificationOffer={onAcceptNotificationOffer}
        onDeclineNotificationOffer={onDeclineNotificationOffer}
        onDismissNotification={onDismissNotification}
        onOpenNotificationTarget={onOpenNotificationTarget}
        onProfileClick={onProfileClick}
      />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-2xl">Sell Swipes</h1>
        </div>

        <Card className="p-6 mb-6 bg-gradient-to-r from-[#fd6500] to-[#ff8534] text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Your Balance</p>
              <p className="font-bold text-3xl">${balance.toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 opacity-80" />
          </div>
        </Card>

        <div className="mb-6">
          <SellingModeControl
            isEnabled={isSellingModeEnabled}
            onChange={onSetSellingMode}
          />
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-xl mb-4">Available Requests</h2>
          {availableRequests.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              No requests available right now. Check back soon!
            </Card>
          ) : (
            <div className="space-y-3">
              {availableRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{request.item}</h3>
                      <p className="text-gray-600 text-sm mt-1">{request.location}</p>
                      <p className="text-xs text-gray-500 mt-1">Requested by {request.buyerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-[#fd6500]">${request.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => onAcceptRequest(request.id)}
                      className="flex-1 bg-[#fd6500] hover:bg-[#e55a00]"
                    >
                      Accept Request
                    </Button>
                    <Button
                      onClick={() => onDeclineRequest(request.id)}
                      className="flex-1"
                      variant="outline"
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-bold text-xl mb-4">My Active Exchanges</h2>
          {myAcceptedRequests.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              No active exchanges. Accept a request to get started!
            </Card>
          ) : (
            <div className="space-y-3">
              {myAcceptedRequests.map((request) => (
                <Card
                  key={request.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onViewExchange(request.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{request.item}</h3>
                      <p className="text-gray-600 text-sm mt-1">{request.location}</p>
                      <p className="text-sm mt-2">
                        <span className="font-semibold">Buyer:</span> {request.buyerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-[#fd6500]">${request.offeredPrice.toFixed(2)}</p>
                      <p className="text-xs mt-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full inline-block">
                        {request.status}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
