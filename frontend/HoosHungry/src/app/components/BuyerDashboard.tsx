import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Plus } from 'lucide-react';

interface BuyerDashboardProps {
  onBack: () => void;
  onCreateRequest: (request: { item: string; price: number; location: string }) => void;
  activeRequests: any[];
  onViewExchange: (exchangeId: string) => void;
}

const MENU_ITEMS = [
  'Burger & Fries',
  'Pizza Slice',
  'Sandwich',
  'Salad',
  'Pasta Bowl',
  'Burrito',
  'Sushi Roll',
  'Chicken Tenders',
  'Quesadilla',
  'Stir Fry'
];

const LOCATIONS = [
  'Newcomb Hall',
  'Observatory Hill Dining',
  'Runk Dining Hall',
  'The Corner',
  'Rice Hall',
  'Clemons Library'
];

export default function BuyerDashboard({ onBack, onCreateRequest, activeRequests, onViewExchange }: BuyerDashboardProps) {
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
    <div className="min-h-screen bg-[#efefef] p-6">
      <div className="max-w-4xl mx-auto">
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
                    {MENU_ITEMS.map(item => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
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
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onViewExchange(request.id)}
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
