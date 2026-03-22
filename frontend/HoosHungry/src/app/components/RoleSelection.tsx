import AppNavbar from './AppNavbar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ShoppingBag, Coins } from 'lucide-react';
import type { NotificationItem } from '../types';

interface RoleSelectionProps {
  notifications: NotificationItem[];
  onAcceptNotificationOffer: (notificationId: string, offerId: string) => void;
  onDeclineNotificationOffer: (notificationId: string, offerId: string) => void;
  onDismissNotification: (notificationId: string) => Promise<void>;
  onProfileClick: () => void;
  onOpenNotificationTarget: (notification: NotificationItem) => void;
  onSelectRole: (role: 'buyer' | 'seller') => void;
}

export default function RoleSelection({
  notifications,
  onAcceptNotificationOffer,
  onDeclineNotificationOffer,
  onDismissNotification,
  onProfileClick,
  onOpenNotificationTarget,
  onSelectRole
}: RoleSelectionProps) {
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
      <div className="flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="font-bold text-4xl mb-3">
              <span className="text-[#fd6500]">hoos</span>
              <span>hungry</span>
            </h1>
            <p className="text-xl text-gray-600">What would you like to do?</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="p-8 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-[#fd6500]"
              onClick={() => onSelectRole('buyer')}
            >
              <ShoppingBag className="h-16 w-16 text-[#fd6500] mx-auto mb-4" />
              <h2 className="font-bold text-2xl text-center mb-3">Buy a Meal</h2>
              <p className="text-gray-600 text-center mb-6">
                Request a meal from the dining hall and get matched with a student who has extra swipes.
              </p>
              <Button className="w-full bg-[#fd6500] hover:bg-[#e55a00] h-12">
                Continue as Buyer
              </Button>
            </Card>

            <Card
              className="p-8 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-[#fd6500]"
              onClick={() => onSelectRole('seller')}
            >
              <Coins className="h-16 w-16 text-[#fd6500] mx-auto mb-4" />
              <h2 className="font-bold text-2xl text-center mb-3">Sell Swipes</h2>
              <p className="text-gray-600 text-center mb-6">
                Turn your extra meal swipes into cash by accepting meal requests from other students.
              </p>
              <Button className="w-full bg-[#fd6500] hover:bg-[#e55a00] h-12">
                Continue as Seller
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
