import { ArrowLeft } from "lucide-react";

import AppNavbar from "./AppNavbar";
import type { AuthUser } from "./AuthScreen";
import SellingModeControl from "./SellingModeControl";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ProfilePageProps {
  onBack: () => void;
  onProfileClick: () => void;
  onSetSellingMode: (nextValue: boolean) => Promise<void>;
  user: AuthUser;
}

export default function ProfilePage({
  onBack,
  onProfileClick,
  onSetSellingMode,
  user,
}: ProfilePageProps) {
  return (
    <div className="min-h-screen bg-[#efefef]">
      <AppNavbar onProfileClick={onProfileClick} />
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
            </div>
          </Card>

          <SellingModeControl
            isEnabled={user.mealExchangeAvailable}
            onChange={onSetSellingMode}
          />
        </div>
      </div>
    </div>
  );
}
