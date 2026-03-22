import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import AppNavbar from "./AppNavbar";
import type { AuthUser } from "./AuthScreen";
import type { NotificationItem, WithdrawalRecord } from "../types";
import SellingModeControl from "./SellingModeControl";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface ProfilePageProps {
  onAcceptNotificationOffer: (notificationId: string, offerId: string) => void;
  onBack: () => void;
  onDeclineNotificationOffer: (notificationId: string, offerId: string) => void;
  onDismissNotification: (notificationId: string) => void;
  onProfileClick: () => void;
  onOpenNotificationTarget: (notification: NotificationItem) => void;
  onSignOut: () => void;
  onSetSellingMode: (nextValue: boolean) => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
  notifications: NotificationItem[];
  user: AuthUser;
  withdrawals: WithdrawalRecord[];
}

export default function ProfilePage({
  onAcceptNotificationOffer,
  onBack,
  onDeclineNotificationOffer,
  onDismissNotification,
  onProfileClick,
  onOpenNotificationTarget,
  onSignOut,
  onSetSellingMode,
  onWithdraw,
  notifications,
  user,
  withdrawals,
}: ProfilePageProps) {
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      return;
    }

    void onWithdraw(amount).then(() => setWithdrawAmount(""));
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
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button onClick={onBack} size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="p-6">
            <h2 className="text-xl font-bold">Account Details</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-gray-500">Name</p>
                <p className="mt-1 text-base text-gray-900">{user.name}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Email</p>
                <p className="mt-1 text-base text-gray-900">{user.email}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Account Type</p>
                <p className="mt-1 text-base text-gray-900">{user.role}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500">Headline</p>
                <p className="mt-1 text-base text-gray-900">
                  {user.headline || "No headline added yet."}
                </p>
              </div>
              <Button
                className="mt-2 w-full"
                onClick={onSignOut}
                variant="outline"
              >
                Sign Out
              </Button>
            </div>
          </Card>

          <SellingModeControl
            isEnabled={user.mealExchangeAvailable}
            onChange={onSetSellingMode}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="self-start p-6">
            <h2 className="text-xl font-bold">Wallet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Withdraw from your seller balance once meal exchange orders are completed.
            </p>
            <p className="mt-4 text-3xl font-bold text-[#fd6500]">
              ${user.walletBalance.toFixed(2)}
            </p>
            <div className="mt-5 flex gap-3">
              <Input
                min="1"
                placeholder="Amount"
                step="0.50"
                type="number"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
              />
              <Button
                className="bg-[#fd6500] text-white hover:bg-[#e55a00]"
                disabled={user.walletBalance <= 0}
                onClick={handleWithdraw}
              >
                Withdraw
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {withdrawals.length === 0 ? (
                <p className="text-sm text-gray-500">No withdrawals yet.</p>
              ) : (
                withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                  >
                    <span>{new Date(withdrawal.createdAtUtc).toLocaleString()}</span>
                    <span className="font-semibold text-[#fd6500]">
                      ${withdrawal.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold">Recent Notifications</h2>
            <div className="mt-5 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="rounded-lg border px-4 py-3">
                    <p className="font-semibold">{notification.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(notification.createdAtUtc).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
