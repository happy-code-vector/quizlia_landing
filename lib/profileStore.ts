import type { Profile } from "@/lib/types";
import { deleteProfileFromFirebase, saveProfileToFirebase } from "@/lib/firebaseProfiles";

// Local profile list (localStorage "profiles") plus the current profile ("currentProfile").
// Shared by profile selection, create profile and settings so the three pages apply the
// same rules. Firestore stays a best-effort mirror for signed-in accounts.

export type ProfileKind = "student" | "parent";

/** Family plan: one parent plus up to four kids (same rule as iOS profileLimit). */
export const FAMILY_KID_LIMIT = 4;

export function isParent(p: { type?: string }): boolean {
  return p.type === "parent";
}

export function readProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem("profiles");
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

export function writeProfiles(profiles: Profile[]): void {
  localStorage.setItem("profiles", JSON.stringify(profiles));
}

export function readCurrentProfile(): Profile | null {
  try {
    const raw = localStorage.getItem("currentProfile");
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function setCurrentProfile(profile: Profile): void {
  localStorage.setItem("currentProfile", JSON.stringify(profile));
}

/** Same-name profiles are the same person (case-insensitive), as in the iOS name-based merge. */
export function nameTaken(name: string, profiles: Profile[], exceptId?: number): boolean {
  const n = name.trim().toLowerCase();
  return profiles.some((p) => p.id !== exceptId && (p.name ?? "").trim().toLowerCase() === n);
}

/** W-7.7 wording. Returns null when the name is fine. */
export function profileNameError(name: string, profiles: Profile[], exceptId?: number): string | null {
  if (!name.trim()) return "Enter a name for this profile";
  if (name.trim().length > 30) return "Name must be 30 characters or fewer";
  if (nameTaken(name, profiles, exceptId)) return `Choose a different name. ${name.trim()} already has a profile`;
  return null;
}

export async function updateProfile(updated: Profile, accountEmail?: string | null): Promise<void> {
  writeProfiles(readProfiles().map((p) => (p.id === updated.id ? updated : p)));
  if (readCurrentProfile()?.id === updated.id) setCurrentProfile(updated);
  if (accountEmail) {
    await saveProfileToFirebase(accountEmail, {
      ...updated,
      createdAt: updated.createdAt ?? new Date().toISOString(),
    });
  }
}

/** Removes the profile, its cached notes and its subscription cache on this device, and the cloud copy when signed in. */
export async function deleteProfile(profile: Profile, accountEmail?: string | null): Promise<void> {
  const email = accountEmail || profile.email;
  if (email) await deleteProfileFromFirebase(email, profile.id);
  writeProfiles(readProfiles().filter((p) => p.id !== profile.id));
  localStorage.removeItem(`content_${profile.id}`);
  localStorage.removeItem(`subscription_${profile.id}`);
  if (readCurrentProfile()?.id === profile.id) localStorage.removeItem("currentProfile");
}

/** Initial letter for the paper monogram face. */
export function profileInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function kindLabel(p: { type?: string }): string {
  return isParent(p) ? "Parent or guardian" : "Kid";
}
