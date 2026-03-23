"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { canGenerate, getSubscription, isPaidSubscription, FREE_GENERATIONS_PER_DAY } from "@/lib/subscription";

interface UsageIndicatorProps {
  profileId: number;
  onUpgradeClick?: () => void;
}

export function UsageIndicator({ profileId, onUpgradeClick }: UsageIndicatorProps) {
  const [usage, setUsage] = useState({ allowed: true, remaining: FREE_GENERATIONS_PER_DAY, limit: FREE_GENERATIONS_PER_DAY });
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const checkUsage = () => {
      const result = canGenerate(profileId);
      setUsage(result);
      setIsPro(isPaidSubscription(profileId));
    };
    checkUsage();
    // Re-check every 5 seconds in case of updates
    const interval = setInterval(checkUsage, 5000);
    return () => clearInterval(interval);
  }, [profileId]);

  // Pro users - show badge
  if (isPro) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full">
        <span className="material-symbols-outlined text-purple-500 text-sm">workspace_premium</span>
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Pro</span>
      </div>
    );
  }

  // Free users - show usage
  const percentage = usage.limit > 0 ? ((usage.limit - usage.remaining) / usage.limit) * 100 : 0;
  const isLow = usage.remaining <= 1;
  const isEmpty = usage.remaining <= 0;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
      isEmpty
        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        : isLow
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${isEmpty ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>

         {isEmpty ? "No generations left" : `${usage.remaining}/${usage.limit} left today`}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isEmpty ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-green-500"
            }`}
            style={{ width: `${100 - percentage}%` }}
          />
        </div>
      </div>
      {onUpgradeClick ? (
        <button
          onClick={onUpgradeClick}
          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 whitespace-nowrap"
        >
          Upgrade
        </button>
      ) : (
        <Link
          href="/pricing"
          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 whitespace-nowrap"
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}
