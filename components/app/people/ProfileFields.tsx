"use client";

import { useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { FAMILY_KID_LIMIT, isParent, profileNameError, type ProfileKind } from "@/lib/profileStore";
import { ChoiceCards, Field, inputClass } from "./FormKit";
import { Button } from "@/components/ui/button";

export const KIND_OPTIONS: { value: ProfileKind; label: string; description: string }[] = [
  { value: "student", label: "Kid", description: "Studies notes, flashcards and quizzes" },
  { value: "parent", label: "Parent or guardian", description: "Adds notes and follows progress" },
];

/** Rule check for a kind change on an existing profile. W-7.7 wording. */
export function kindError(kind: ProfileKind, profiles: Profile[], selfId: number | null, family: boolean): string | null {
  const others = profiles.filter((p) => p.id !== selfId);
  if (kind === "parent" && others.some(isParent)) return "There is already a parent profile. Choose Kid";
  if (kind === "student" && family && others.filter((p) => !isParent(p)).length >= FAMILY_KID_LIMIT) {
    return `Family plans include up to ${FAMILY_KID_LIMIT} kids. Keep this as a parent profile`;
  }
  return null;
}

interface EditProfileFormProps {
  profile: Profile;
  profiles: Profile[];
  family: boolean;
  idPrefix: string;
  onSave: (updated: Profile) => Promise<void>;
  /** Extra actions under Save (delete link in the dialog). */
  footer?: React.ReactNode;
  submitLabel?: string;
}

/**
 * Name and kind for an existing profile. Two fields, so a failed submit moves focus to the
 * first invalid field (W-7.6) instead of showing a summary.
 */
export function EditProfileForm({ profile, profiles, family, idPrefix, onSave, footer, submitLabel = "Save changes" }: EditProfileFormProps) {
  const [name, setName] = useState(profile.name);
  const [kind, setKind] = useState<ProfileKind>(isParent(profile) ? "parent" : "student");
  const [errors, setErrors] = useState<{ name?: string | null; kind?: string | null }>({});
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const validate = (n = name, k = kind) => ({
    name: profileNameError(n, profiles, profile.id),
    kind: k === (isParent(profile) ? "parent" : "student") ? null : kindError(k, profiles, profile.id, family),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecked(true);
    const next = validate();
    setErrors(next);
    if (next.name || next.kind) {
      const target = next.name ? `${idPrefix}-name` : `${idPrefix}-kind`;
      document.getElementById(target)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...profile, name: name.trim(), type: kind });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const unchanged = name.trim() === profile.name && kind === (isParent(profile) ? "parent" : "student");

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
      <Field id={`${idPrefix}-name`} label="Name" error={errors.name}>
        {(aria) => (
          <input
            {...aria}
            type="text"
            autoComplete="off"
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
              if (checked) setErrors((er) => ({ ...er, name: profileNameError(e.target.value, profiles, profile.id) }));
            }}
            className={inputClass(!!errors.name)}
          />
        )}
      </Field>
      <ChoiceCards
        name={`${idPrefix}-kind`}
        idPrefix={`${idPrefix}-kind`}
        legend="Who is this profile for?"
        value={kind}
        options={KIND_OPTIONS}
        error={errors.kind}
        onChange={(k) => {
          setKind(k);
          setSaved(false);
          if (checked) setErrors((er) => ({ ...er, kind: validate(name, k).kind }));
        }}
      />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving || unchanged}>{saving ? "Saving" : submitLabel}</Button>
          <p role="status" className="text-subheadline text-supporting">{saved && unchanged ? "Saved" : ""}</p>
        </div>
        {footer}
      </div>
    </form>
  );
}
