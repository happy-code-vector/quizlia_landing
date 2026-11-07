"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { canGenerate, isPaidSubscription } from "@/lib/subscription";

interface UsageIndicatorProps {
  profileId: number;
  onUpgradeClick?: () => void;
}

export function UsageIndicator({ profileId, onUpgradeClick }: UsageIndicatorProps) {
  const [usage, setUsage] = useState({ allowed: true, remaining: 1, limit: 1 });
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const checkUsage = () => {
      setUsage(canGenerate(profileId));
      setIsPro(isPaidSubscription(profileId));
    };
    checkUsage();
    // Re-check every 5 seconds in case of updates
    const interval = setInterval(checkUsage, 5000);
    return () => clearInterval(interval);
  }, [profileId]);

  if (isPro) {
    return (
      <div className="ds-card flex items-center gap-2 rounded-[0.875rem] px-3 py-2">
        <Crown aria-hidden="true" strokeWidth={1.75} className="size-4 text-rust" />
        <span className="text-subheadline font-semibold">Pro</span>
      </div>
    );
  }

  const used = usage.limit > 0 ? Math.min(100, ((usage.limit - usage.remaining) / usage.limit) * 100) : 0;
  const isEmpty = usage.remaining <= 0;
  const label = isEmpty
    ? "No free notes left"
    : `${usage.remaining} of ${usage.limit} ${usage.limit === 1 ? "free note" : "free notes"} left`;
  const upgradeClass = "text-footnote font-semibold text-rust hover:underline";

  return (
    <div className="ds-card flex flex-col gap-2 rounded-[0.875rem] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular text-footnote text-supporting">{label}</span>
        {onUpgradeClick ? (
          <button type="button" onClick={onUpgradeClick} className={upgradeClass}>Upgrade</button>
        ) : (
          <Link href="/note/pricing" className={upgradeClass}>Upgrade</Link>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Free notes used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(used)}
        className="h-1.5 overflow-hidden rounded-full bg-track"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${used}%` }} />
      </div>
    </div>
  );
}
