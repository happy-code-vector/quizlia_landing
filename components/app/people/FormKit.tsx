"use client";

import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

// W-7 form pieces shared by the people screens: visible labels, hint before error,
// error above the input with an "Error:" prefix, error summary for forms with 3+ fields.

export const inputClass = (invalid: boolean) =>
  `h-11 w-full rounded-xl bg-card px-3 text-callout text-label ${invalid ? "border-2 border-danger" : "border border-input"}`;

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-subheadline text-danger">
      <CircleAlert aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
      <span><span className="sr-only">Error: </span>{children}</span>
    </p>
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  /** Receives the aria props the control needs (W-7.5). */
  children: (aria: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => ReactNode;
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-subheadline font-semibold text-label">{label}</label>
      {hint && <p id={hintId} className="text-subheadline text-supporting">{hint}</p>}
      {error && <FieldError id={errorId!}>{error}</FieldError>}
      {children({ id, "aria-describedby": describedBy, ...(error ? { "aria-invalid": true as const } : {}) })}
    </div>
  );
}

export interface SummaryItem {
  /** id of the field (or first radio) to focus. */
  href: string;
  message: string;
}

/**
 * W-7.6 error summary: gets focus on a failed submit, links to each invalid field,
 * and prefixes the document title with "Error: " while shown.
 */
export const ErrorSummary = forwardRef<HTMLDivElement, { items: SummaryItem[]; attempt: number }>(function ErrorSummary(
  { items, attempt },
  ref,
) {
  const local = useRef<HTMLDivElement | null>(null);
  const shown = items.length > 0;
  // Focus moves here only on a failed submit (attempt changes), never while the user types.
  useEffect(() => {
    if (attempt > 0) local.current?.focus();
  }, [attempt]);
  useEffect(() => {
    if (!shown) return;
    document.title = `Error: ${document.title.replace(/^Error: /, "")}`;
    return () => {
      document.title = document.title.replace(/^Error: /, "");
    };
  }, [shown]);
  if (!items.length) return null;
  return (
    <div
      ref={(el) => {
        local.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="flex flex-col gap-2 rounded-2xl border-2 border-danger bg-card p-4"
    >
      <h2 id="error-summary-title" className="text-headline text-label">There is a problem</h2>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={`#${item.href}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.href)?.focus();
              }}
              className="text-subheadline font-semibold text-danger underline underline-offset-4"
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});

/** W-7.11: problems the user cannot fix in a field (plan limits, network) with the next action. */
export function InlineBanner({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border border-card-stroke bg-card p-4 shadow-card">
      <p className="flex items-start gap-2 text-subheadline text-label">
        <CircleAlert aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-danger" />
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/** Radio group drawn as two cards. Native radios keep arrow-key behavior and semantics (W-7.10). */
export function ChoiceCards<T extends string>({
  name, legend, value, onChange, options, error, idPrefix,
}: {
  name: string;
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: ChoiceOption<T>[];
  error?: string | null;
  idPrefix: string;
}) {
  const errorId = `${idPrefix}-error`;
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1.5 text-subheadline font-semibold text-label">{legend}</legend>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o, i) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-3 py-3 ${
                checked ? "border-[1.5px] border-rust bg-rust-wash" : error ? "border-2 border-danger bg-card" : "border border-input bg-card hover:bg-hover-fill"
              }`}
            >
              <input
                id={i === 0 ? idPrefix : `${idPrefix}-${o.value}`}
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="mt-0.5 size-5 shrink-0 accent-[var(--primary-fill)]"
              />
              <span className="flex flex-col">
                <span className="text-headline text-label">{o.label}</span>
                {o.description && <span className="text-subheadline text-supporting">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Password control with the W-7.9 show/hide toggle. Takes the aria props from Field. */
export function PasswordInput({
  aria, value, onChange, autoComplete, invalid,
}: {
  aria: { id: string; "aria-describedby"?: string; "aria-invalid"?: true };
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  invalid: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...aria}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass(invalid)} pr-12`}
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
  );
}
