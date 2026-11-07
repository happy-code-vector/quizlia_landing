"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { APP_STORE_URL } from "@/lib/constants";
import { SHOW_APP_QR_EVENT, isOptedOut, optOutQr, shouldShowSigninQr } from "@/lib/appPromo";
import { Icon } from "@/components/app/Icon";

// Floating App Store QR nudge: shown once per profile on first app visit,
// on the 1st generation, and every 5th (event-driven — see useGenerateContent).
// ✕ hides until the next trigger; "Don't show again" opts out permanently.
export function AppPromoQRCard() {
  const [visible, setVisible] = useState(false);
  const [profileId, setProfileId] = useState<number | string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = localStorage.getItem("currentProfile");
    const pid = current ? (JSON.parse(current).id ?? null) : null;
    setProfileId(pid);
    if (pid === null || isOptedOut(pid)) return;
    if (shouldShowSigninQr(pid)) setVisible(true);
  }, []);

  useEffect(() => {
    const onShow = () => {
      if (profileId === null || isOptedOut(profileId)) return;
      setVisible(true);
    };
    window.addEventListener(SHOW_APP_QR_EVENT, onShow);
    return () => window.removeEventListener(SHOW_APP_QR_EVENT, onShow);
  }, [profileId]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="relative w-44 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-4">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Hide for now"
          title="Hide for now"
        >
          <Icon name="close" className="text-base" />
        </button>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 pt-3"
        >
          <span className="rounded-xl border border-gray-100 bg-white p-1.5">
            <Image
              src="/app-qr.svg"
              alt="QR code to download QuizliAI on the App Store"
              width={112}
              height={112}
              unoptimized
              className="block h-28 w-28"
            />
          </span>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">QuizliAI on your phone</span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Scan to download on the App Store</span>
        </a>
        <button
          onClick={() => {
            if (profileId !== null) optOutQr(profileId);
            setVisible(false);
          }}
          className="mt-2 w-full text-[11px] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 underline underline-offset-2 transition-colors"
        >
          Don&rsquo;t show again
        </button>
      </div>
    </div>
  );
}
