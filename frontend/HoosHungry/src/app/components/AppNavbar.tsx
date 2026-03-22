import { User } from "lucide-react";

import logoImage from "../../assets/5136746a46ed76cbb1efd9b3e613bfce3aaf02de.png";
import { Button } from "./ui/button";

interface AppNavbarProps {
  profileLabel?: string;
}

export default function AppNavbar({
  profileLabel = "Profile",
}: AppNavbarProps) {
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

        <Button
          className="h-10 rounded-[6px] bg-[#fd6500] px-4 text-white hover:bg-[#e55a00]"
          type="button"
        >
          <User className="mr-2 h-4 w-4" />
          {profileLabel}
        </Button>
      </div>
    </header>
  );
}
