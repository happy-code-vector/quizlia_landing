"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, InlineBanner, inputClass } from "./FormKit";

export type AuthMode = "signin" | "signup";

/** Auth failures the user fixes in a field come back with `field`; the rest show as a banner (W-7.11). */
export interface AuthFailure {
  field?: "email" | "password";
  message: string;
}

/** Maps Firebase auth error codes to W-7.7 wording. Unknown codes fall back to a generic banner. */
export function authFailure(code: string | undefined, mode: AuthMode): AuthFailure | null {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return { message: "Your browser blocked the Google sign-in window. Allow pop-ups for quizliai.com, then try again." };
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return { message: "The email address or password is not right. Check both, then try again. If you are new, choose Create an account." };
    case "auth/invalid-email":
      return { field: "email", message: "Enter an email address like name@example.com" };
    case "auth/email-already-in-use":
      return { field: "email", message: "An account already uses this email address. Sign in instead" };
    case "auth/weak-password":
      return { field: "password", message: "Use at least 6 characters for your password" };
    case "auth/too-many-requests":
      return { message: "Too many attempts. Wait a few minutes, then try again." };
    case "auth/network-request-failed":
      return { message: "QuizliAI can't be reached. Check your connection, then try again." };
    default:
      return { message: mode === "signup" ? "Your account was not created. Try again in a minute." : "You were not signed in. Try again in a minute." };
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignInPanelProps {
  googleAvailable: boolean;
  onGoogle: () => Promise<AuthFailure | null>;
  onEmail: (mode: AuthMode, email: string, password: string) => Promise<AuthFailure | null>;
  onSkip: () => void;
}

/** Step 1 of create profile. Two fields, so a failed submit focuses the first invalid one (W-7.6). W-7.9 auth rules. */
export function SignInPanel({ googleAvailable, onGoogle, onEmail, onSkip }: SignInPanelProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  const emailError = (v: string) =>
    !v.trim() ? "Enter your email address" : !EMAIL_RE.test(v.trim()) ? "Enter an email address like name@example.com" : null;
  const passwordError = (v: string, m = mode) =>
    !v ? (m === "signup" ? "Create a password" : "Enter your password") : m === "signup" && v.length < 6 ? "Use at least 6 characters for your password" : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecked(true);
    setBanner(null);
    const next = { email: emailError(email), password: passwordError(password) };
    setErrors(next);
    if (next.email || next.password) {
      document.getElementById(next.email ? "auth-email" : "auth-password")?.focus();
      return;
    }
    setBusy("email");
    const failure = await onEmail(mode, email.trim(), password);
    setBusy(null);
    if (failure?.field) {
      setErrors((er) => ({ ...er, [failure.field!]: failure.message }));
      document.getElementById(`auth-${failure.field}`)?.focus();
    } else if (failure) {
      setBanner(failure.message);
    }
  };

  const google = async () => {
    setBanner(null);
    setBusy("google");
    const failure = await onGoogle();
    setBusy(null);
    if (failure) setBanner(failure.message);
  };

  const switchMode = () => {
    const m: AuthMode = mode === "signin" ? "signup" : "signin";
    setMode(m);
    setBanner(null);
    if (checked) setErrors({ email: emailError(email), password: passwordError(password, m) });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 tabIndex={-1} className="font-serif text-title font-semibold">Keep your notes on every device.</h1>
        <p className="text-subheadline text-supporting">Sign in to sync profiles and notes with the QuizliAI iPhone app.</p>
      </div>

      {banner && <InlineBanner>{banner}</InlineBanner>}

      <div className="ds-card flex flex-col gap-5 p-5 sm:p-6">
        <Button variant="secondary" size="lg" className="w-full" onClick={google} disabled={!googleAvailable || busy !== null}>
          <img src="/brand/google-g.svg" alt="" width={20} height={20} className="size-5" />
          {busy === "google" ? "Opening Google" : "Continue with Google"}
        </Button>

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-divider" />
          <span className="text-subheadline text-supporting">or</span>
          <span className="h-px flex-1 bg-divider" />
        </div>

        <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-label={mode === "signin" ? "Sign in with email" : "Create an account with email"}>
          <Field id="auth-email" label="Email address" error={errors.email}>
            {(aria) => (
              <input
                {...aria}
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (checked) setErrors((er) => ({ ...er, email: emailError(e.target.value) }));
                }}
                className={inputClass(!!errors.email)}
              />
            )}
          </Field>
          <Field
            id="auth-password"
            label="Password"
            hint={mode === "signup" ? "Use at least 6 characters." : undefined}
            error={errors.password}
          >
            {(aria) => (
              <div className="relative">
                <input
                  {...aria}
                  type={show ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (checked) setErrors((er) => ({ ...er, password: passwordError(e.target.value) }));
                  }}
                  className={`${inputClass(!!errors.password)} pr-12`}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  aria-pressed={show}
                  onClick={() => setShow((v) => !v)}
                  className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-full text-supporting hover:text-label"
                >
                  {show ? <EyeOff aria-hidden="true" strokeWidth={1.75} className="size-5" /> : <Eye aria-hidden="true" strokeWidth={1.75} className="size-5" />}
                </button>
              </div>
            )}
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
            {busy === "email" ? (mode === "signin" ? "Signing in" : "Creating account") : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-subheadline text-supporting">
          {mode === "signin" ? "New to QuizliAI? " : "Already have an account? "}
          <button type="button" onClick={switchMode} className="font-semibold text-rust underline-offset-4 hover:underline">
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="self-center rounded-full px-3 py-2 text-subheadline font-semibold text-rust-on-tint underline-offset-4 hover:underline"
      >
        Continue without syncing
      </button>
      <p className="text-center text-subheadline text-supporting">Without an account, profiles and notes stay on this device only.</p>
    </div>
  );
}
