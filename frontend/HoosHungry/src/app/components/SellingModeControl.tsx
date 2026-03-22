import { useState } from "react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Switch } from "./ui/switch";

interface SellingModeControlProps {
  isEnabled: boolean;
  isBusy?: boolean;
  onChange: (nextValue: boolean) => Promise<void>;
}

export default function SellingModeControl({
  isEnabled,
  isBusy = false,
  onChange,
}: SellingModeControlProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState(isEnabled);
  const [submitting, setSubmitting] = useState(false);

  const openForValue = (nextValue: boolean) => {
    setPendingValue(nextValue);
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);

    try {
      await onChange(pendingValue);
      setDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const enabling = pendingValue;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Selling Mode</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Turn this on when you are ready to receive meal exchange
              requests and decide whether to accept or reject them.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">
              {isEnabled ? "On" : "Off"}
            </span>
            <Switch
              checked={isEnabled}
              className="data-[state=checked]:bg-[#fd6500]"
              disabled={isBusy || submitting}
              onCheckedChange={openForValue}
            />
          </div>
        </div>
      </Card>

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enabling ? "Turn on selling mode?" : "Turn off selling mode?"}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {enabling
                ? "Before turning this on, make sure you already have a meal exchange ready to order. Once selling mode is live, you will receive meal exchange requests and can accept or reject them from the seller view."
                : "Turning selling mode off will pause new meal exchange requests. You can turn it back on any time when you are ready to receive offers again."}
            </DialogDescription>
          </DialogHeader>

          {enabling && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
              Buyers will be able to send you meal exchange requests while this
              is on.
            </div>
          )}

          <DialogFooter>
            <Button
              disabled={submitting}
              onClick={() => setDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#fd6500] text-white hover:bg-[#e55a00]"
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting
                ? "Saving..."
                : enabling
                  ? "Enable Selling Mode"
                  : "Disable Selling Mode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
