"use client";

import { useAuth } from "@/lib/auth";
import { ForgotView, resetFailure } from "@/components/app/welcome/AuthViews";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  return (
    <ForgotView
      onSend={async (email) => {
        try {
          await resetPassword(email);
          return null;
        } catch (error) {
          return resetFailure((error as { code?: string }).code);
        }
      }}
    />
  );
}
