import { useState } from 'react';
import AppNavbar from './AppNavbar';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ArrowLeft, MapPin, Clock, CheckCircle2, User } from 'lucide-react';
import type { NotificationItem, OrderRecord, OrderStatus } from '../types';

interface ExchangeViewProps {
  notifications: NotificationItem[];
  onAcceptNotificationOffer: (notificationId: string, offerId: string) => void;
  onBack: () => void;
  onDeclineNotificationOffer: (notificationId: string, offerId: string) => void;
  onDismissNotification: (notificationId: string) => void;
  onProfileClick: () => void;
  onOpenNotificationTarget: (notification: NotificationItem) => void;
  exchange: OrderRecord;
  userRole: 'buyer' | 'seller';
  onConfirmOrder: (orderId: string) => Promise<void>;
  onUpdateTracking: (
    orderId: string,
    status: OrderStatus,
    detail: string,
    estimatedReadyAtUtc?: string | null,
  ) => Promise<void>;
}

export default function ExchangeView({
  notifications,
  onAcceptNotificationOffer,
  onBack,
  onDeclineNotificationOffer,
  onDismissNotification,
  onProfileClick,
  onOpenNotificationTarget,
  exchange,
  userRole,
  onConfirmOrder,
  onUpdateTracking
}: ExchangeViewProps) {
  const [trackingNote, setTrackingNote] = useState('');
  const [etaInput, setEtaInput] = useState('');

  const isComplete = exchange.status === 'Completed';
  const canManageTracking =
    userRole === 'seller' && exchange.grubhubConfirmed && !isComplete;

  const handleTrackingUpdate = (status: OrderStatus, fallbackDetail: string) => {
    return onUpdateTracking(
      exchange.id,
      status,
      trackingNote.trim() || fallbackDetail,
      etaInput ? new Date(etaInput).toISOString() : null,
    );
  };

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
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-2xl">Exchange Details</h1>
        </div>

        <Card className="p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="font-bold text-2xl mb-2">{exchange.item}</h2>
              <p className="text-gray-600">{exchange.location}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-3xl text-[#fd6500]">${exchange.offeredPrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Buyer:</span> {exchange.buyerName}
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Seller:</span> {exchange.sellerName}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Status:</span> {exchange.status}
            </div>
          </div>
        </Card>

        {isComplete ? (
          <Card className="p-8 text-center bg-green-50 border-green-200">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl text-green-900 mb-2">Exchange Complete!</h3>
            <p className="text-gray-700">
              {userRole === 'buyer'
                ? 'Payment processed successfully. Enjoy your meal!'
                : `$${exchange.offeredPrice.toFixed(2)} has been added to your balance.`}
            </p>
          </Card>
        ) : (
          <>
            <Card className="p-6 mb-4 bg-blue-50 border-blue-200">
              <h3 className="font-bold text-lg mb-3">Tracking History</h3>
              {exchange.trackingEvents.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No tracking updates yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {exchange.trackingEvents.map((event) => (
                    <div key={event.id} className="border-b border-blue-100 pb-3 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">{event.label}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{event.detail}</p>
                      {event.estimatedReadyAtUtc && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-blue-700">
                          <MapPin className="h-4 w-4" />
                          <span>ETA: {new Date(event.estimatedReadyAtUtc).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {userRole === 'seller' && !exchange.grubhubConfirmed && (
              <Card className="p-6 mb-4">
                <h3 className="font-bold text-lg mb-3">Confirm Meal Exchange Order</h3>
                <p className="text-gray-700 mb-4">
                  Once you have the meal exchange ready to place, confirm it here to move the order into active tracking.
                </p>
                <Button
                  onClick={() => onConfirmOrder(exchange.id)}
                  className="w-full bg-[#fd6500] hover:bg-[#e55a00] h-12"
                >
                  Confirm Order in GrubHub
                </Button>
              </Card>
            )}

            {canManageTracking && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-3">Update Order Status</h3>
                <p className="text-gray-700 mb-4">
                  Send buyer-facing tracking updates as the meal exchange moves from preparation to pickup and completion.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 font-semibold">Tracking note</label>
                    <Textarea
                      placeholder="Optional detail for the buyer"
                      value={trackingNote}
                      onChange={(event) => setTrackingNote(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">ETA (optional)</label>
                    <Input
                      type="datetime-local"
                      value={etaInput}
                      onChange={(event) => setEtaInput(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Button
                      className="bg-[#fd6500] hover:bg-[#e55a00]"
                      onClick={() =>
                        handleTrackingUpdate(
                          'ReadySoon',
                          'Order should be ready soon.'
                        )
                      }
                    >
                      Mark Ready Soon
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() =>
                        handleTrackingUpdate(
                          'ReadyForPickup',
                          'Meal exchange is ready for pickup.'
                        )
                      }
                    >
                      Mark Ready
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleTrackingUpdate(
                          'Completed',
                          'Exchange completed.'
                        )
                      }
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {userRole === 'buyer' && !exchange.grubhubConfirmed && (
              <Card className="p-6 text-center text-gray-600">
                Waiting for the seller to confirm the meal exchange order.
              </Card>
            )}

            {userRole === 'buyer' && exchange.grubhubConfirmed && !isComplete && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-3">Order In Progress</h3>
                <p className="text-gray-700">
                  The seller is updating this order through the real tracking flow. Check back here for ready-soon and pickup updates.
                </p>
              </Card>
            )}

            {userRole === 'seller' && exchange.grubhubConfirmed && !canManageTracking && !isComplete && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-3">Tracking Sent</h3>
                <p className="text-gray-700">
                  This exchange is already in progress. Continue using the status updates above as needed.
                </p>
              </Card>
            )}

            {userRole === 'buyer' && exchange.status === 'ReadyForPickup' && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-3">Ready for Pickup</h3>
                <p className="text-gray-700">
                  The seller marked the meal exchange ready. Coordinate pickup and watch for the final completion update.
                </p>
              </Card>
            )}

            {userRole === 'seller' && exchange.status === 'ReadyForPickup' && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-3">Ready to Finish</h3>
                <p className="text-gray-700 mb-4">
                  After the handoff is done, mark the exchange complete.
                </p>
                <Button
                  onClick={() =>
                    handleTrackingUpdate('Completed', 'Exchange completed.')
                  }
                  className="w-full bg-green-600 hover:bg-green-700 h-12"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Mark Exchange Complete
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
