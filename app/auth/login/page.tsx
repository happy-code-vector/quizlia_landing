"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authFailure } from "@/components/app/people/SignInPanel";
import { LoginView } from "@/components/app/welcome/AuthViews";
import { postAuthPath } from "@/lib/authRedirect";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, isConfigured } = useAuth();

  return (
    <LoginView
      googleAvailable={isConfigured}
      onEmail={async (email, password) => {
        try {
          await signIn(email, password);
          router.push(postAuthPath());
          return null;
        } catch (error) {
          return authFailure((error as { code?: string }).code, "signin");
        }
      }}
      onGoogle={async () => {
        try {
          await signInWithGoogle();
          router.push(postAuthPath());
          return null;
        } catch (error) {
          return authFailure((error as { code?: string }).code, "signin");
        }
      }}
    />
  );
}
