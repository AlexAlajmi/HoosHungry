import { useEffect, useState } from "react";
import { Bell, User, X } from "lucide-react";

import type { NotificationItem } from "../types";
import logoImage from "../../assets/5136746a46ed76cbb1efd9b3e613bfce3aaf02de.png";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "./ui/utils";

interface AppNavbarProps {
  notifications?: NotificationItem[];
  onAcceptNotificationOffer?: (
    notificationId: string,
    offerId: string,
  ) => void;
  onDeclineNotificationOffer?: (
    notificationId: string,
    offerId: string,
  ) => void;
  onDismissNotification?: (notificationId: string) => Promise<void>;
  onOpenNotificationTarget?: (notification: NotificationItem) => void;
  onProfileClick?: () => void;
  profileLabel?: string;
}

function getNotificationActionLabel(notification: NotificationItem) {
  switch (notification.actionType) {
    case "ConfirmOrder":
      return "Open Order";
    case "ViewOrder":
      return "View Order";
    case "OpenSellerDashboard":
      return "Open Seller";
    case "OpenBuyerDashboard":
      return "Open Buyer";
    default:
      return "Open";
  }
}

export default function AppNavbar({
  notifications = [],
  onAcceptNotificationOffer,
  onDeclineNotificationOffer,
  onDismissNotification,
  onOpenNotificationTarget,
  onProfileClick,
  profileLabel = "Profile",
}: AppNavbarProps) {
  const [dismissingIds, setDismissingIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissingIds((current) =>
      current.filter((id) =>
        notifications.some((notification) => notification.id === id),
      ),
    );
  }, [notifications]);

  const handleDismiss = async (notificationId: string) => {
    if (!onDismissNotification || dismissingIds.includes(notificationId)) {
      return;
    }

    setDismissingIds((current) => [...current, notificationId]);

    await new Promise((resolve) => window.setTimeout(resolve, 180));

    try {
      await onDismissNotification(notificationId);
    } catch {
      setDismissingIds((current) =>
        current.filter((id) => id !== notificationId),
      );
    }
  };

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-[56px] w-[64px] overflow-hidden">
            <img
              alt="HoosHungry logo"
              className="h-full w-full object-contain"
              src={logoImage}
            />
          </div>
          <div className="text-2xl font-bold leading-none">
            <span className="text-[#fd6500]">hoos</span>
            <span>hungry</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative inline-flex h-10 items-center justify-center rounded-[6px] border border-[#fd6500] bg-white px-4 text-sm font-medium text-[#fd6500] transition-colors hover:bg-[#fff3eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd6500]/30"
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {notifications.length > 0 && (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#fd6500] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {notifications.length}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[26rem] border bg-white p-0"
              sideOffset={8}
            >
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Notifications</h3>
                  <span className="text-xs text-gray-500">
                    {notifications.length} active
                  </span>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">
                  No notifications right now.
                </div>
              ) : (
                <ScrollArea className="max-h-[24rem]">
                  <div className="p-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "origin-top overflow-hidden transition-all duration-200 ease-out",
                          dismissingIds.includes(notification.id)
                            ? "mb-0 max-h-0 translate-y-[-6px] scale-[0.98] opacity-0"
                            : "mb-3 max-h-[18rem] translate-y-0 scale-100 opacity-100 last:mb-0",
                        )}
                      >
                        <div className="rounded-lg border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {notification.message}
                              </p>
                              <p className="mt-2 text-xs text-gray-500">
                                {new Date(
                                  notification.createdAtUtc,
                                ).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              className="h-8 w-8 shrink-0"
                              disabled={dismissingIds.includes(notification.id)}
                              onClick={() => void handleDismiss(notification.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {notification.actionType === "ReviewOffer" &&
                              notification.actionTargetId && (
                                <>
                                  <Button
                                    className="bg-[#fd6500] text-white hover:bg-[#e55a00]"
                                    onClick={() =>
                                      onAcceptNotificationOffer?.(
                                        notification.id,
                                        notification.actionTargetId!,
                                      )
                                    }
                                    size="sm"
                                    type="button"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      onDeclineNotificationOffer?.(
                                        notification.id,
                                        notification.actionTargetId!,
                                      )
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    Decline
                                  </Button>
                                </>
                              )}

                            {notification.actionType !== "ReviewOffer" &&
                              notification.actionTargetId && (
                                <Button
                                  className="bg-[#fd6500] text-white hover:bg-[#e55a00]"
                                  onClick={() =>
                                    onOpenNotificationTarget?.(notification)
                                  }
                                  size="sm"
                                  type="button"
                                >
                                  {getNotificationActionLabel(notification)}
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="h-10 rounded-[6px] bg-[#fd6500] px-4 text-white hover:bg-[#e55a00]"
            onClick={onProfileClick}
            type="button"
          >
            <User className="mr-2 h-4 w-4" />
            {profileLabel}
          </Button>
        </div>
      </div>
    </header>
  );
}
