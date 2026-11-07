"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";

/** Body of the delete confirmation inside a CardDialog. The dialog title names the profile. */
export function DeleteProfileConfirm({
  profile, signedIn, onCancel, onConfirm,
}: {
  profile: Profile;
  signedIn: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-label">
        {signedIn
          ? `This deletes ${profile.name} and ${profile.name}'s notes on this device and in your QuizliAI account.`
          : `This deletes ${profile.name} and ${profile.name}'s notes on this device.`}{" "}
        You can&rsquo;t undo this.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="destructive"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting" : `Delete ${profile.name}`}
        </Button>
        <Button variant="secondary" onClick={onCancel} autoFocus>Cancel</Button>
      </div>
    </div>
  );
}
