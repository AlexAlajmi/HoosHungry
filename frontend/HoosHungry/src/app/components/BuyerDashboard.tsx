import { useState } from 'react';
import AppNavbar from './AppNavbar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Plus } from 'lucide-react';
import type { BuyerRequestSummary, NotificationItem } from '../types';

interface BuyerDashboardProps {
  notifications: NotificationItem[];
  onAcceptNotificationOffer: (notificationId: string, offerId: string) => void;
  onBack: () => void;
  onDeclineNotificationOffer: (notificationId: string, offerId: string) => void;
  onDismissNotification: (notificationId: string) => Promise<void>;
  onProfileClick: () => void;
  onOpenNotificationTarget: (notification: NotificationItem) => void;
  onCreateRequest: (request: { item: string; price: number; location: string }) => void;
  activeRequests: BuyerRequestSummary[];
  onViewExchange: (exchangeId: string) => void;
}

const RESTAURANT_MENUS: { restaurant: string; items: string[] }[] = [
  {
    restaurant: "Hoos Hot Chicken",
    items: [
      "3pc tenders with fries",
      "Nashville hot chicken sando with fries",
      "4pc breaded wings with fries",
    ],
  },
  {
    restaurant: "Twisted Tortilla",
    items: [
      "Steak quesadilla",
      "Cheese quesadilla",
      "Chicken quesadilla",
      "3 chicken tacos",
      "3 steak tacos",
      "3 veggie tacos",
    ],
  },
  {
    restaurant: "Rice Bowl Express",
    items: [
      "Chicken pita wrap",
      "Gyro pita wrap",
      "Falafel pita wrap",
      "Chicken over rice",
      "Gyro over rice",
      "Falafel over rice",
    ],
  },
  {
    restaurant: "Za'Atar at The Castle",
    items: ["Build your bowl", "Build your wrap"],
  },
  {
    restaurant: "Daily Dose",
    items: [
      "Small hot coffee with pastry",
      "Bacon, egg & cheese croissant",
      "Egg & cheese croissant",
      "3 pack chicken tenders",
      "Corndog",
      "Caesar salad",
    ],
  },
  {
    restaurant: "West Range Cafe",
    items: [
      "Bacon, egg & cheese croissant",
      "Egg & cheese croissant",
      "3 pack chicken tenders",
    ],
  },
  {
    restaurant: "Einstein Bros. Bagels - Rice Hall",
    items: [
      "Cheddar & egg sandwich",
      "Turkey sausage & cheddar egg sandwich",
      "Cinnamon muffin",
    ],
  },
  {
    restaurant: "Subway - Newcomb Hall",
    items: [
      "6 in. Black Forest ham",
      "6 in. Turkey breast",
      "6 in. Veggie Delite",
    ],
  },
];

const LOCATIONS = [
  'Newcomb Hall',
  'Observatory Hill Dining',
  'The Castle',
  'Rice Hall',
  'West Range',
  'The Corner',
  'Runk Dining Hall',
  'Clemons Library'
];

export default function BuyerDashboard({
  notifications,
  onAcceptNotificationOffer,
  onBack,
  onDeclineNotificationOffer,
  onDismissNotification,
  onProfileClick,
  onOpenNotificationTarget,
  onCreateRequest,
  activeRequests,
  onViewExchange
}: BuyerDashboardProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = () => {
    if (selectedItem && price && location) {
      onCreateRequest({
        item: selectedItem,
        price: parseFloat(price),
        location
      });
      setSelectedItem('');
      setPrice('');
      setLocation('');
      setShowForm(false);
    }
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-2xl">Buy Meals</h1>
        </div>

        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full mb-6 bg-[#fd6500] hover:bg-[#e55a00] h-14"
          >
            <Plus className="h-5 w-5 mr-2" />
            Request a Meal
          </Button>
        ) : (
          <Card className="p-6 mb-6">
            <h2 className="font-bold text-xl mb-4">New Request</h2>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-semibold">Menu Item</label>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESTAURANT_MENUS.map(({ restaurant, items }) => (
                      <SelectGroup key={restaurant}>
                        <SelectLabel className="font-bold text-[#fd6500]">{restaurant}</SelectLabel>
                        {items.map(item => (
                          <SelectItem key={`${restaurant}-${item}`} value={`${item} (${restaurant})`}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 font-semibold">Your Offer ($)</label>
                <Input
                  type="number"
                  step="0.50"
                  min="1"
                  max="20"
                  placeholder="e.g., 8.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-2 font-semibold">Pickup Location</label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-[#fd6500] hover:bg-[#e55a00]"
                  disabled={!selectedItem || !price || !location}
                >
                  Send Request
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div>
          <h2 className="font-bold text-xl mb-4">Your Requests</h2>
          {activeRequests.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              No active requests. Create one to get started!
            </Card>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((request) => (
                <Card
                  key={request.id}
                  className={request.exchangeId
                    ? "p-4 cursor-pointer hover:shadow-md transition-shadow"
                    : "p-4"}
                  onClick={() => request.exchangeId && onViewExchange(request.exchangeId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{request.item}</h3>
                      <p className="text-gray-600 text-sm mt-1">{request.location}</p>
                      {request.sellerName && (
                        <p className="text-sm mt-2">
                          <span className="font-semibold text-[#fd6500]">Matched with:</span> {request.sellerName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-[#fd6500]">${request.price.toFixed(2)}</p>
                      <p className="text-xs mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full inline-block">
                        {request.statusLabel}
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
