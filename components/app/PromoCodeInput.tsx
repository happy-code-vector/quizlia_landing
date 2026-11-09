"use client";

import { useState } from "react";
import { applyPromoCode } from "@/lib/firebaseSubscription";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/app/people/FormKit";

interface PromoCodeInputProps {
  email: string;
  profileId: number;
  onSuccess?: () => void;
  /** Fixtures pass a stub so no request is made. */
  apply?: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
}

/** One-field form (W-7): visible label, validate on submit, server message shown under the label. */
export function PromoCodeInput({ email, onSuccess, apply = applyPromoCode }: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecked(true);
    setDone(null);
    if (!code.trim()) {
      setError("Enter a promo code");
      document.getElementById("promo-code")?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await apply(email, code.trim().toUpperCase());
      if (result.success) {
        setDone(result.message);
        setCode("");
        onSuccess?.();
        // Reload so the shell and plan section read the new subscription.
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(result.message || "That promo code did not work. Check it, then try again");
        document.getElementById("promo-code")?.focus();
      }
    } catch {
      setError("The promo code was not applied. Try again in a minute");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3" aria-label="Promo code">
      <Field id="promo-code" label="Promo code" hint="Codes from QuizliAI emails and partners." error={error}>
        {(aria) => (
          <div className="flex gap-2">
            <input
              {...aria}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              value={code}
              disabled={busy}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (checked && error && e.target.value.trim()) setError(null);
              }}
              className={`${inputClass(!!error)} min-w-0 flex-1 uppercase`}
            />
            <Button type="submit" variant="secondary" disabled={busy}>{busy ? "Applying" : "Apply"}</Button>
          </div>
        )}
      </Field>
      <p role="status" className="text-subheadline text-label">{done}</p>
    </form>
  );
}
