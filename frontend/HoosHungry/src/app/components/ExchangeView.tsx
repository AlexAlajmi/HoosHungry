import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ArrowLeft, MapPin, Clock, CheckCircle2, User } from 'lucide-react';

interface ExchangeViewProps {
  onBack: () => void;
  exchange: any;
  userRole: 'buyer' | 'seller';
  onProposeMeetup: (meetupDetails: { time: string; location: string; notes: string }) => void;
  onConfirmExchange: () => void;
}

export default function ExchangeView({
  onBack,
  exchange,
  userRole,
  onProposeMeetup,
  onConfirmExchange
}: ExchangeViewProps) {
  const [showMeetupForm, setShowMeetupForm] = useState(false);
  const [meetupTime, setMeetupTime] = useState('');
  const [meetupLocation, setMeetupLocation] = useState(exchange.location);
  const [notes, setNotes] = useState('');

  const handlePropose = () => {
    if (meetupTime && meetupLocation) {
      onProposeMeetup({ time: meetupTime, location: meetupLocation, notes });
      setShowMeetupForm(false);
    }
  };

  const canConfirm = exchange.status === 'meeting scheduled' || exchange.status === 'pending confirmation';
  const isComplete = exchange.status === 'completed';
  const waitingForOther = exchange.status === 'pending confirmation' &&
    ((userRole === 'buyer' && exchange.buyerConfirmed) ||
     (userRole === 'seller' && exchange.sellerConfirmed));

  return (
    <div className="min-h-screen bg-[#efefef] p-6">
      <div className="max-w-2xl mx-auto">
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
              <p className="font-bold text-3xl text-[#fd6500]">${exchange.price.toFixed(2)}</p>
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
          </div>
        </Card>

        {isComplete ? (
          <Card className="p-8 text-center bg-green-50 border-green-200">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="font-bold text-xl text-green-900 mb-2">Exchange Complete!</h3>
            <p className="text-gray-700">
              {userRole === 'buyer'
                ? 'Payment processed successfully. Enjoy your meal!'
                : `$${exchange.price.toFixed(2)} has been added to your balance.`}
            </p>
          </Card>
        ) : (
          <>
            {exchange.meetupTime ? (
              <Card className="p-6 mb-4 bg-blue-50 border-blue-200">
                <h3 className="font-bold text-lg mb-3">Meeting Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>{exchange.meetupTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>{exchange.meetupLocation}</span>
                  </div>
                  {exchange.meetupNotes && (
                    <p className="text-sm text-gray-700 mt-3 pt-3 border-t">
                      <span className="font-semibold">Note:</span> {exchange.meetupNotes}
                    </p>
                  )}
                </div>
              </Card>
            ) : (
              <>
                {userRole === 'seller' && !showMeetupForm && (
                  <Button
                    onClick={() => setShowMeetupForm(true)}
                    className="w-full mb-4 bg-[#fd6500] hover:bg-[#e55a00] h-12"
                  >
                    Propose Meeting Time & Place
                  </Button>
                )}

                {showMeetupForm && (
                  <Card className="p-6 mb-4">
                    <h3 className="font-bold text-lg mb-4">Propose Meetup</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 font-semibold">Time</label>
                        <Input
                          type="datetime-local"
                          value={meetupTime}
                          onChange={(e) => setMeetupTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold">Location</label>
                        <Input
                          value={meetupLocation}
                          onChange={(e) => setMeetupLocation(e.target.value)}
                          placeholder="e.g., Front entrance of Newcomb Hall"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold">Notes (optional)</label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g., I'll be wearing a blue jacket"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handlePropose}
                          className="flex-1 bg-[#fd6500] hover:bg-[#e55a00]"
                          disabled={!meetupTime || !meetupLocation}
                        >
                          Send Proposal
                        </Button>
                        <Button
                          onClick={() => setShowMeetupForm(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {userRole === 'buyer' && !exchange.meetupTime && (
                  <Card className="p-6 mb-4 text-center text-gray-600">
                    Waiting for seller to propose a meeting time and location...
                  </Card>
                )}
              </>
            )}

            {canConfirm && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-3">Confirm Exchange</h3>
                <p className="text-gray-700 mb-4">
                  Once you meet in person and complete the exchange, tap the button below.
                  Both parties must confirm before payment is processed.
                </p>

                {waitingForOther ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="font-semibold text-yellow-900">You've confirmed!</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Waiting for the other person to confirm...
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={onConfirmExchange}
                    className="w-full bg-green-600 hover:bg-green-700 h-12"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    I Confirm the Exchange is Complete
                  </Button>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
