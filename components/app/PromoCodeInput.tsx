"use client";

import { useState } from "react";
import { applyPromoCode } from "@/lib/firebaseSubscription";
import { useToast } from "./ToastContainer";

interface PromoCodeInputProps {
  email: string;
  profileId: number;
  onSuccess?: () => void;
}

export function PromoCodeInput({ email, profileId, onSuccess }: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const { showToast } = useToast();

  const handleApply = async () => {
    if (!code.trim()) {
      showToast("Please enter a promo code", "error");
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyPromoCode(email, code.trim().toUpperCase());

      if (result.success) {
        showToast(result.message, "success");
        setCode("");
        onSuccess?.();

        // Reload page to refresh subscription
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast(result.message, "error");
      }
    } catch (error) {
      showToast("Failed to apply promo code", "error");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter promo code"
        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        disabled={isApplying}
        maxLength={20}
      />
      <button
        onClick={handleApply}
        disabled={isApplying || !code.trim()}
        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {isApplying ? (
          <>
            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            Applying...
          </>
        ) : (
          "Apply"
        )}
      </button>
    </div>
  );
}
