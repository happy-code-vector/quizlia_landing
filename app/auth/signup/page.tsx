"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authFailure } from "@/components/app/people/SignInPanel";
import { SignupView, signupFailure } from "@/components/app/welcome/AuthViews";
import { postAuthPath } from "@/lib/authRedirect";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, isConfigured } = useAuth();

  return (
    <SignupView
      googleAvailable={isConfigured}
      onEmail={async (name, email, password) => {
        try {
          await signUp(email, password, name);
          router.push("/note/create-profile");
          return null;
        } catch (error) {
          return signupFailure((error as { code?: string }).code);
        }
      }}
      onGoogle={async () => {
        try {
          await signInWithGoogle();
          router.push(postAuthPath());
          return null;
        } catch (error) {
          return authFailure((error as { code?: string }).code, "signup");
        }
      }}
    />
  );
}
