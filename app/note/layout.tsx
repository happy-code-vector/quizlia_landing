"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/app/ToastContainer";
import { RouteFocus } from "@/components/app/shell/RouteFocus";
import { AppPromoQRCard } from "@/components/app/AppPromoQRCard";
import { watchAdminFlag } from "@/lib/admin";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Track users/{uid}.admin so client gates match the server's bypass.
  useEffect(() => {
    watchAdminFlag();
  }, []);

  useEffect(() => {
    // Check for profile in localStorage
    if (typeof window !== "undefined") {
      const currentProfile = localStorage.getItem("currentProfile");

      // Pages that don't require profile (public pages)
      const publicPages = [
        "/note/profile-selection",
        "/note/create-profile",
        "/note/pricing",
        "/note/subscription/success"
      ];
      const isPublicPage = publicPages.some(page => pathname?.startsWith(page));

      // Check if this is a public study guide detail page (/note/[slug] but NOT /note/ itself)
      // /note/ is the dashboard and requires auth
      const isStudyGuideDetailPage = pathname?.match(/^\/note\/[^\/]+$/) && pathname !== "/note";

      if (!currentProfile && !isPublicPage && !isStudyGuideDetailPage && !loading) {
        router.push("/note/profile-selection");
      }
    }
  }, [pathname, router, loading]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center" role="status">
        <div aria-hidden="true" className="family-surface family-home" />
        <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-track border-b-rust"></div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    <>
      <RouteFocus />
      <AppPromoQRCard />
      {children}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </ToastProvider>
    </AuthProvider>
  );
}
