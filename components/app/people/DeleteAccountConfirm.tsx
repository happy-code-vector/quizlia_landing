"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, InlineBanner, inputClass } from "./FormKit";
import { SUPPORT_EMAIL } from "@/lib/support";
import type { ReauthMethod } from "@/lib/account-delete";

/** Same shape as lib/deleteAccount's result, so the view stays props-only for fixtures. */
export type DeleteAccountStep =
  | { status: "done" }
  | { status: "reauth"; method: ReauthMethod }
  | { status: "error"; message: string; field?: "password" }
  | { status: "cancelled" };

export interface DeleteAccountConfirmProps {
  email: string;
  /** A paid plan is not cancelled by deleting the account. */
  paid: boolean;
  onDelete: (input: { password?: string; popup?: boolean }) => Promise<DeleteAccountStep>;
  onCancel: () => void;
}

const PROVIDER: Record<"google" | "apple", string> = { google: "Google", apple: "Apple" };

/** Body of the delete-account CardDialog: confirm, then sign in again when Firebase asks for it. */
export function DeleteAccountConfirm({ email, paid, onDelete, onCancel }: DeleteAccountConfirmProps) {
  const [reauth, setReauth] = useState<ReauthMethod | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const run = async (input: { password?: string; popup?: boolean }) => {
    setBusy(true);
    setBanner(null);
    setFieldError(null);
    try {
      const step = await onDelete(input);
      if (step.status === "reauth") setReauth(step.method);
      else if (step.status === "error") {
        if (step.field === "password") {
          setFieldError(step.message);
          document.getElementById("delete-account-password")?.focus();
        } else setBanner(step.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = (
    <Button variant="secondary" onClick={onCancel} disabled={busy} autoFocus={!reauth}>Cancel</Button>
  );

  if (reauth === "password") {
    return (
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!password) {
            setFieldError("Enter your password");
            document.getElementById("delete-account-password")?.focus();
            return;
          }
          void run({ password });
        }}
      >
        <p className="text-body text-label">To keep your account safe, enter the password for {email} to delete it.</p>
        {banner && <InlineBanner>{banner}</InlineBanner>}
        <Field id="delete-account-password" label="Password" error={fieldError}>
          {(aria) => (
            <div className="relative">
              <input
                {...aria}
                autoFocus
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldError) setFieldError(e.target.value ? null : "Enter your password");
                }}
                className={`${inputClass(!!fieldError)} pr-12`}
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
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="destructive" disabled={busy}>{busy ? "Deleting" : "Delete account"}</Button>
          {cancel}
        </div>
      </form>
    );
  }

  if (reauth === "google" || reauth === "apple") {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-body text-label">
          To keep your account safe, sign in with {PROVIDER[reauth]} again as {email}. Your account is deleted right after.
        </p>
        {banner && <InlineBanner>{banner}</InlineBanner>}
        <div className="flex flex-wrap gap-3">
          <Button variant="destructive" disabled={busy} onClick={() => void run({ popup: true })} autoFocus>
            {busy ? "Deleting" : `Sign in with ${PROVIDER[reauth]} and delete`}
          </Button>
          {cancel}
        </div>
      </div>
    );
  }

  if (reauth === "unsupported") {
    return (
      <div className="flex flex-col gap-5">
        <InlineBanner>Sign out, sign in again, then delete your account.</InlineBanner>
        <div className="flex flex-wrap gap-3">{cancel}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-label">
        This deletes the QuizliAI account for {email}, every profile and all notes, flashcards and quizzes, on this
        device and in the cloud. You can&rsquo;t undo this.
      </p>
      {paid && (
        <p className="text-subheadline text-label">
          Deleting your account does not cancel your plan. To cancel it, email{" "}
          <a className="font-semibold text-rust underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
          before you delete.
        </p>
      )}
      {banner && <InlineBanner>{banner}</InlineBanner>}
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" disabled={busy} onClick={() => void run({})}>
          {busy ? "Deleting" : "Delete account"}
        </Button>
        {cancel}
      </div>
    </div>
  );
}
