"use client";

import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { FAMILY_KID_LIMIT, isParent, profileNameError, type ProfileKind } from "@/lib/profileStore";
import { Button } from "@/components/ui/button";
import { ChoiceCards, ErrorSummary, Field, InlineBanner, inputClass, type SummaryItem } from "./FormKit";
import { KIND_OPTIONS } from "./ProfileFields";

export interface NewProfileInput {
  name: string;
  type: ProfileKind;
  gradeLevel: string;
}

const GRADES = [
  { value: "", label: "Not set" },
  { value: "elementary", label: "Elementary school" },
  { value: "middle", label: "Middle school" },
  { value: "high", label: "High school" },
  { value: "college", label: "College" },
  { value: "adult", label: "Adult learner" },
];

interface CreateProfileFormProps {
  profiles: Profile[];
  /** Max profiles on the account's plan (1 for free and individual plans). */
  maxProfiles: number;
  initialKind?: ProfileKind;
  accountEmail: string | null;
  /** Shown only when there is a profile to go back to. */
  cancelHref?: string;
  onCreate: (input: NewProfileInput) => Promise<void>;
}

type PlanBlock = "single" | "kids" | null;

/**
 * Step 2 of create profile. Three fields, so a failed submit shows the error summary (W-7.6).
 * Plan limits are not field errors: they show as a banner with the next action (W-7.11).
 */
export function CreateProfileForm({ profiles, maxProfiles, initialKind = "student", accountEmail, cancelHref, onCreate }: CreateProfileFormProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProfileKind>(initialKind);
  const [grade, setGrade] = useState("");
  const [errors, setErrors] = useState<{ name?: string | null; kind?: string | null }>({});
  const [attempt, setAttempt] = useState(0);
  const [block, setBlock] = useState<PlanBlock>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const family = maxProfiles > 1;
  const kidCount = profiles.filter((p) => !isParent(p)).length;
  const kindError = (k: ProfileKind) => (k === "parent" && profiles.some(isParent) ? "There is already a parent profile. Choose Kid" : null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailed(false);
    if (!family && profiles.length >= 1) return setBlock("single");
    if (family && kind === "student" && kidCount >= FAMILY_KID_LIMIT) return setBlock("kids");
    setBlock(null);
    const next = { name: profileNameError(name, profiles), kind: kindError(kind) };
    setErrors(next);
    if (next.name || next.kind) {
      setAttempt((a) => a + 1);
      return;
    }
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), type: kind, gradeLevel: kind === "student" ? grade : "" });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const summary: SummaryItem[] = [
    errors.name ? { href: "new-profile-name", message: errors.name } : null,
    errors.kind ? { href: "new-profile-kind", message: errors.kind } : null,
  ].filter((x): x is SummaryItem => !!x);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 tabIndex={-1} className="font-serif text-title font-semibold">Who&rsquo;s this profile for?</h1>
        <p className="text-subheadline text-supporting">
          {accountEmail ? `Signed in as ${accountEmail}. Profiles sync to the iPhone app.` : "Each kid gets their own notes, flashcards and quizzes."}
        </p>
      </div>

      <ErrorSummary items={summary} attempt={attempt} />

      {block === "single" && (
        <InlineBanner action={<Button asChild variant="secondary" className="self-start"><Link href="/note/pricing">See Family plan</Link></Button>}>
          Your plan includes 1 profile. Family Annual adds a parent or guardian and up to {FAMILY_KID_LIMIT} kids.
        </InlineBanner>
      )}
      {block === "kids" && (
        <InlineBanner action={<Button asChild variant="secondary" className="self-start"><Link href="/note/profile-selection">Go to profiles</Link></Button>}>
          Family Annual includes up to {FAMILY_KID_LIMIT} kids. To add another, delete a kid profile first.
        </InlineBanner>
      )}
      {failed && <InlineBanner>The profile was not saved. Try again in a minute.</InlineBanner>}

      <form noValidate onSubmit={submit} aria-label="New profile" className="ds-card flex flex-col gap-5 p-5 sm:p-6">
        <Field id="new-profile-name" label="Name" hint="A first name or nickname. It shows on the profile picker." error={errors.name}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              autoComplete="off"
              maxLength={40}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (attempt) setErrors((er) => ({ ...er, name: profileNameError(e.target.value, profiles) }));
              }}
              className={inputClass(!!errors.name)}
            />
          )}
        </Field>

        <ChoiceCards
          name="new-profile-kind"
          idPrefix="new-profile-kind"
          legend="Profile type"
          value={kind}
          options={KIND_OPTIONS}
          error={errors.kind}
          onChange={(k) => {
            setKind(k);
            setBlock(null);
            if (attempt) setErrors((er) => ({ ...er, kind: kindError(k) }));
          }}
        />

        {kind === "student" && (
          <Field id="new-profile-grade" label="Grade level (optional)">
            {(aria) => (
              <select {...aria} value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass(false)}>
                {GRADES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            )}
          </Field>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Creating profile" : "Create profile"}</Button>
          {cancelHref && (
            <Button asChild variant="link">
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
