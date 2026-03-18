"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/app/ToastContainer";
import { ThemeProvider } from "@/components/app/ThemeProvider";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

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
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#964CEE]"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
