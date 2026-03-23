"use client";

import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/app/ToastContainer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
