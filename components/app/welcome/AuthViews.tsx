"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorSummary, Field, FieldError, InlineBanner, PasswordInput, inputClass, type SummaryItem } from "@/components/app/people/FormKit";
import { authFailure, type AuthFailure } from "@/components/app/people/SignInPanel";
import { WelcomeFrame } from "./WelcomeFrame";

// Auth screens of the welcome family. W-7 forms, W-7.9 auth rules (paste and password managers work,
// show-password toggle, Google kept as an alternative). Views are props-only; pages own Firebase.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SIGNUP_MIN_PASSWORD = 8;
const TERMS_URL = "https://sites.google.com/view/quizliai-terms/home";
const PRIVACY_URL = "https://sites.google.com/view/quizliai-privacy/home";

const emailError = (v: string) =>
  !v.trim() ? "Enter your email address" : !EMAIL_RE.test(v.trim()) ? "Enter an email address like name@example.com" : null;

/** Signup uses the web's 8-character rule, not the generic Firebase 6. */
export function signupFailure(code: string | undefined): AuthFailure | null {
  if (code === "auth/weak-password") return { field: "password", message: `Use at least ${SIGNUP_MIN_PASSWORD} characters for your password` };
  return authFailure(code, "signup");
}

/** Reset: an unknown address is treated as sent, so the form does not reveal which emails have accounts. */
export function resetFailure(code: string | undefined): AuthFailure | null {
  switch (code) {
    case "auth/user-not-found":
      return null;
    case "auth/invalid-email":
      return { field: "email", message: "Enter an email address like name@example.com" };
    case "auth/too-many-requests":
      return { message: "Too many requests. Wait a few minutes, then try again." };
    case "auth/network-request-failed":
      return { message: "QuizliAI can't be reached. Check your connection, then try again." };
    default:
      return { message: "The reset link was not sent. Try again in a minute." };
  }
}

function GoogleButton({ available, busy, disabled, onClick }: { available: boolean; busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" size="lg" className="w-full" onClick={onClick} disabled={!available || disabled}>
      <img src="/brand/google-g.svg" alt="" width={20} height={20} className="size-5" />
      {busy ? "Opening Google" : "Continue with Google"}
    </Button>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-divider" />
      <span className="text-subheadline text-supporting">or</span>
      <span className="h-px flex-1 bg-divider" />
    </div>
  );
}

function Heading({ title, sub, headingRef }: { title: string; sub: string; headingRef?: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 ref={headingRef} tabIndex={-1} className="font-serif text-title font-semibold">{title}</h1>
      <p className="text-subheadline text-supporting">{sub}</p>
    </div>
  );
}

function Alt({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-subheadline text-supporting">{children}</p>;
}

const altLink = "font-semibold text-rust underline-offset-4 hover:underline";
/** Links that sit directly on the family tint, not on a card (W-2: rust text on a tint uses the on-tint token). */
const tintLink = "font-semibold text-rust-on-tint underline-offset-4 hover:underline";

// ---------------------------------------------------------------- login

export interface LoginViewProps {
  googleAvailable: boolean;
  onGoogle: () => Promise<AuthFailure | null>;
  onEmail: (email: string, password: string) => Promise<AuthFailure | null>;
}

/** Two fields, so a failed submit focuses the first invalid one (W-7.6). */
export function LoginView({ googleAvailable, onGoogle, onEmail }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const passwordError = (v: string) => (!v ? "Enter your password" : null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecked(true);
    setBanner(null);
    const next = { email: emailError(email), password: passwordError(password) };
    setErrors(next);
    if (next.email || next.password) {
      document.getElementById(next.email ? "login-email" : "login-password")?.focus();
      return;
    }
    setBusy("email");
    const failure = await onEmail(email.trim(), password);
    setBusy(null);
    if (failure?.field) {
      setErrors((er) => ({ ...er, [failure.field!]: failure.message }));
      document.getElementById(`login-${failure.field}`)?.focus();
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

  return (
    <WelcomeFrame>
      <title>Sign in | QuizliAI</title>
      <div className="flex flex-col gap-6">
        <Heading title="Welcome back." sub="Sign in to pick up where you left off." />
        {banner && <InlineBanner>{banner}</InlineBanner>}
        {!googleAvailable && <InlineBanner>Sign-in is not set up in this environment.</InlineBanner>}
        <div className="ds-card flex flex-col gap-5 p-5 sm:p-6">
          <GoogleButton available={googleAvailable} busy={busy === "google"} disabled={busy !== null} onClick={google} />
          <OrDivider />
          <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-label="Sign in with email">
            <Field id="login-email" label="Email address" error={errors.email}>
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
            <Field id="login-password" label="Password" error={errors.password}>
              {(aria) => (
                <PasswordInput
                  aria={aria}
                  value={password}
                  autoComplete="current-password"
                  invalid={!!errors.password}
                  onChange={(v) => {
                    setPassword(v);
                    if (checked) setErrors((er) => ({ ...er, password: passwordError(v) }));
                  }}
                />
              )}
            </Field>
            <Link href="/auth/forgot-password" className="-my-1.5 inline-flex min-h-11 items-center self-start text-subheadline font-semibold text-rust underline-offset-4 hover:underline">
              Forgot your password?
            </Link>
            <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
              {busy === "email" ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </div>
        <Alt>
          New to QuizliAI? <Link href="/auth/signup" className={tintLink}>Create an account</Link>
        </Alt>
      </div>
    </WelcomeFrame>
  );
}

// ---------------------------------------------------------------- signup

export interface SignupViewProps {
  googleAvailable: boolean;
  onGoogle: () => Promise<AuthFailure | null>;
  onEmail: (name: string, email: string, password: string) => Promise<AuthFailure | null>;
}

type SignupErrors = Partial<Record<"name" | "email" | "password" | "confirm" | "terms", string | null>>;

/** Five controls, so a failed submit focuses an error summary that links to each invalid field (W-7.6). */
export function SignupView({ googleAvailable, onGoogle, onEmail }: SignupViewProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  const v = {
    name: (x: string) => (!x.trim() ? "Enter your name" : null),
    email: emailError,
    password: (x: string) => (!x ? "Create a password" : x.length < SIGNUP_MIN_PASSWORD ? `Use at least ${SIGNUP_MIN_PASSWORD} characters for your password` : null),
    confirm: (x: string, pw = password) => (!x ? "Enter your password again" : x !== pw ? "Enter the same password in both fields" : null),
    terms: (x: boolean) => (x ? null : "Agree to the Terms and Privacy Policy to create an account"),
  };

  const FIELD_IDS: Record<keyof SignupErrors, string> = {
    name: "signup-name", email: "signup-email", password: "signup-password", confirm: "signup-confirm", terms: "signup-terms",
  };
  const order = ["name", "email", "password", "confirm", "terms"] as const;
  const summary: SummaryItem[] = order.filter((k) => errors[k]).map((k) => ({ href: FIELD_IDS[k], message: errors[k]! }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecked(true);
    setBanner(null);
    const next: SignupErrors = {
      name: v.name(name), email: v.email(email), password: v.password(password), confirm: v.confirm(confirm), terms: v.terms(terms),
    };
    setErrors(next);
    if (order.some((k) => next[k])) {
      setAttempt((n) => n + 1);
      return;
    }
    setBusy("email");
    const failure = await onEmail(name.trim(), email.trim(), password);
    setBusy(null);
    if (failure?.field) {
      setErrors({ [failure.field]: failure.message });
      setAttempt((n) => n + 1);
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

  const live = <K extends keyof SignupErrors>(k: K, msg: string | null) => {
    if (checked) setErrors((er) => ({ ...er, [k]: msg }));
  };

  return (
    <WelcomeFrame>
      <title>Create an account | QuizliAI</title>
      <div className="flex flex-col gap-6">
        <Heading title="Make quizzes from any lesson." sub="Create an account to keep your notes on every device." />
        <ErrorSummary items={summary} attempt={attempt} />
        {banner && <InlineBanner>{banner}</InlineBanner>}
        {!googleAvailable && <InlineBanner>Sign-up is not set up in this environment.</InlineBanner>}
        <div className="ds-card flex flex-col gap-5 p-5 sm:p-6">
          <GoogleButton available={googleAvailable} busy={busy === "google"} disabled={busy !== null} onClick={google} />
          <OrDivider />
          <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-label="Create an account with email">
            <Field id={FIELD_IDS.name} label="Name" error={errors.name}>
              {(aria) => (
                <input
                  {...aria}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); live("name", v.name(e.target.value)); }}
                  className={inputClass(!!errors.name)}
                />
              )}
            </Field>
            <Field id={FIELD_IDS.email} label="Email address" error={errors.email}>
              {(aria) => (
                <input
                  {...aria}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); live("email", v.email(e.target.value)); }}
                  className={inputClass(!!errors.email)}
                />
              )}
            </Field>
            <Field id={FIELD_IDS.password} label="Password" hint={`Use at least ${SIGNUP_MIN_PASSWORD} characters.`} error={errors.password}>
              {(aria) => (
                <PasswordInput
                  aria={aria}
                  value={password}
                  autoComplete="new-password"
                  invalid={!!errors.password}
                  onChange={(x) => {
                    setPassword(x);
                    live("password", v.password(x));
                    if (checked && confirm) setErrors((er) => ({ ...er, confirm: v.confirm(confirm, x) }));
                  }}
                />
              )}
            </Field>
            <Field id={FIELD_IDS.confirm} label="Confirm password" error={errors.confirm}>
              {(aria) => (
                <PasswordInput
                  aria={aria}
                  value={confirm}
                  autoComplete="new-password"
                  invalid={!!errors.confirm}
                  onChange={(x) => { setConfirm(x); live("confirm", v.confirm(x)); }}
                />
              )}
            </Field>
            <div className="flex flex-col gap-1.5">
              {errors.terms && <FieldError id="signup-terms-error">{errors.terms}</FieldError>}
              <div className="flex items-start gap-3">
                <input
                  id={FIELD_IDS.terms}
                  type="checkbox"
                  checked={terms}
                  aria-invalid={errors.terms ? true : undefined}
                  aria-describedby={errors.terms ? "signup-terms-error" : undefined}
                  onChange={(e) => { setTerms(e.target.checked); live("terms", v.terms(e.target.checked)); }}
                  className="mt-0.5 size-5 shrink-0 accent-[var(--primary-fill)]"
                />
                <label htmlFor={FIELD_IDS.terms} className="text-subheadline text-label">
                  I agree to the{" "}
                  <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={altLink}>Terms<span className="sr-only"> (opens in a new tab)</span></a>
                  {" "}and{" "}
                  <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className={altLink}>Privacy Policy<span className="sr-only"> (opens in a new tab)</span></a>
                </label>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
              {busy === "email" ? "Creating account" : "Create account"}
            </Button>
          </form>
        </div>
        <Alt>
          Already have an account? <Link href="/auth/login" className={tintLink}>Sign in</Link>
        </Alt>
      </div>
    </WelcomeFrame>
  );
}

// ---------------------------------------------------------------- forgot password

export interface ForgotViewProps {
  onSend: (email: string) => Promise<AuthFailure | null>;
  /** Fixture hook: render the confirmation state. */
  initialSent?: string;
}

/** One field: failed submit focuses it (W-7.6). After sending, focus moves to the confirmation heading. */
export function ForgotView({ onSend, initialSent }: ForgotViewProps) {
  const [email, setEmail] = useState(initialSent ?? "");
  const [sentTo, setSentTo] = useState<string | null>(initialSent ?? null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current && sentTo) sentHeading.current?.focus();
    mounted.current = true;
  }, [sentTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecked(true);
    setBanner(null);
    const err = emailError(email);
    setError(err);
    if (err) {
      document.getElementById("forgot-email")?.focus();
      return;
    }
    setBusy(true);
    const failure = await onSend(email.trim());
    setBusy(false);
    if (!failure) setSentTo(email.trim());
    else if (failure.field) {
      setError(failure.message);
      document.getElementById("forgot-email")?.focus();
    } else setBanner(failure.message);
  };

  if (sentTo) {
    return (
      <WelcomeFrame>
        <title>Check your email | QuizliAI</title>
        <div className="flex flex-col gap-6">
          <Heading
            headingRef={sentHeading}
            title="Check your email."
            sub={`If an account uses ${sentTo}, a link to reset your password is on its way. It can take a few minutes. Look in your spam folder if it does not arrive.`}
          />
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full"><Link href="/auth/login">Back to sign in</Link></Button>
            <button
              type="button"
              onClick={() => { setSentTo(null); setChecked(false); setError(null); }}
              className="inline-flex min-h-11 items-center justify-center self-center rounded-full px-3 text-subheadline font-semibold text-rust-on-tint underline-offset-4 hover:underline"
            >
              Use a different email address
            </button>
          </div>
        </div>
      </WelcomeFrame>
    );
  }

  return (
    <WelcomeFrame>
      <title>Reset your password | QuizliAI</title>
      <div className="flex flex-col gap-6">
        <Heading title="Reset your password." sub="Enter the email address you signed up with and we will send you a link." />
        {banner && <InlineBanner>{banner}</InlineBanner>}
        <form noValidate onSubmit={submit} className="ds-card flex flex-col gap-5 p-5 sm:p-6" aria-label="Reset your password">
          <Field id="forgot-email" label="Email address" error={error}>
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
                  if (checked) setError(emailError(e.target.value));
                }}
                className={inputClass(!!error)}
              />
            )}
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Sending" : "Send reset link"}
          </Button>
        </form>
        <Alt>
          Remembered it? <Link href="/auth/login" className={tintLink}>Back to sign in</Link>
        </Alt>
      </div>
    </WelcomeFrame>
  );
}
