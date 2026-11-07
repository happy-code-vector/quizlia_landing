"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Cloud, Plus } from "lucide-react";
import type { Profile } from "@/lib/types";
import { FAMILY_KID_LIMIT, isParent } from "@/lib/profileStore";
import { CardDialog } from "@/components/app/CardDialog";
import { Button } from "@/components/ui/button";
import { ProfileFace } from "./ProfileFace";
import { EditProfileForm } from "./ProfileFields";
import { DeleteProfileConfirm } from "./DeleteProfileConfirm";

export interface ProfilePickerViewProps {
  profiles: Profile[];
  currentId: number | null;
  /** Family plan: 1 parent + up to 4 kids. Otherwise 1 profile in total. */
  family: boolean;
  /** Signed-in account email, or null for a device-only (anonymous) user. */
  accountEmail: string | null;
  /** False on first run (no profile chosen yet), so there is nowhere to go back to. */
  canGoBack: boolean;
  onSelect: (profile: Profile) => void;
  onSave: (profile: Profile) => Promise<void>;
  onDelete: (profile: Profile) => Promise<void>;
  /** Fixture only: open in edit mode. */
  initialEditing?: boolean;
}

const addHref = (kind: "student" | "parent") => `/note/create-profile?add=1&kind=${kind}`;

/**
 * Choose profile, ported from the approved iOS design (Option A tile grid, 2026-11-03).
 * Tapping a profile selects it and continues in the same tap. Edit switches every face to a pencil
 * and opens the edit dialog instead.
 */
export function ProfilePickerView({
  profiles, currentId, family, accountEmail, canGoBack, onSelect, onSave, onDelete, initialEditing = false,
}: ProfilePickerViewProps) {
  const [editing, setEditing] = useState(initialEditing);
  const [editId, setEditId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);

  const kids = profiles.filter((p) => !isParent(p));
  const parents = profiles.filter(isParent);
  const ordered = [...kids, ...parents];
  const current = profiles.find((p) => p.id === currentId) ?? null;
  const editingProfile = profiles.find((p) => p.id === editId) ?? null;

  // Plan gates (same rules as iOS didSelectItemAt): single plans hold one profile in total.
  const kidSpotsLeft = family ? FAMILY_KID_LIMIT - kids.length : 0;
  const canAddKid = family ? kidSpotsLeft > 0 : profiles.length === 0;
  const canAddParent = family ? parents.length === 0 : profiles.length === 0;

  const pick = (p: Profile) => {
    if (editing) {
      returnRef.current = null;
      setConfirmDelete(false);
      setEditId(p.id);
    } else {
      onSelect(p);
    }
  };

  const closeEdit = () => {
    setEditId(null);
    setConfirmDelete(false);
  };

  // W-5.4: after a delete, focus the next profile, else the previous, else the heading.
  const handleDelete = async (p: Profile) => {
    const i = ordered.findIndex((x) => x.id === p.id);
    const neighbor = ordered[i + 1] ?? ordered[i - 1];
    returnRef.current =
      (neighbor && listRef.current?.querySelector<HTMLElement>(`[data-profile-id="${neighbor.id}"]`)) || headingRef.current;
    await onDelete(p);
    closeEdit();
  };

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-people" />

      <header className="mx-auto flex h-14 w-full max-w-[45rem] items-center justify-between px-2 sm:px-4">
        {canGoBack ? (
          <Link href="/note" className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-subheadline font-semibold text-rust-on-tint hover:underline">
            <ChevronLeft aria-hidden="true" strokeWidth={1.75} className="size-5" />
            Back
          </Link>
        ) : (
          <span />
        )}
        {profiles.length > 0 && (
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => setEditing((v) => !v)}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-subheadline font-semibold text-rust-on-tint hover:underline"
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </header>

      <main id="main" className="mx-auto flex w-full max-w-[45rem] flex-col gap-6 px-4 pt-2 pb-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <img src="/mascot/quizliai_mascot_wave.webp" alt="" width={26} height={26} className="size-[1.625rem] object-contain" />
            <h1 ref={headingRef} tabIndex={-1} className="font-serif text-title font-semibold lg:text-large-title">
              Who&rsquo;s studying?
            </h1>
          </div>
          <p className="text-subheadline text-supporting">{editing ? "Tap a name to edit it." : "Tap a name to start."}</p>
        </div>

        <div ref={listRef} className="flex flex-col gap-6">
          <section aria-labelledby="kids-heading" className="ds-card rounded-[1.375rem] p-5 sm:p-6">
            <h2 id="kids-heading" className="sr-only">Kids</h2>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
              {kids.map((p) => {
                const isCurrent = p.id === currentId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      data-profile-id={p.id}
                      onClick={() => pick(p)}
                      className="group flex w-full flex-col items-center gap-2 rounded-2xl px-1 py-2 hover:bg-hover-fill"
                    >
                      <ProfileFace name={p.name} current={isCurrent} editing={editing} />
                      <span className="max-w-full truncate text-headline text-label">
                        {editing && <span className="sr-only">Edit </span>}
                        {p.name}
                        {isCurrent && !editing && <span className="sr-only">, current profile</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!editing && (
                <li>
                  <AddTile
                    label="Add a kid"
                    line={family ? (kidSpotsLeft > 0 ? `${kidSpotsLeft} of ${FAMILY_KID_LIMIT} spots left` : "No spots left") : "With Family Plan"}
                    href={canAddKid ? addHref("student") : null}
                    disabled={family && kidSpotsLeft <= 0}
                    onUpgrade={() => setUpgradeOpen(true)}
                  />
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="parents-heading" className="flex flex-col gap-2">
            <h2 id="parents-heading" className="px-1 text-headline text-label">
              Parent or guardian
            </h2>
            <ul className="flex flex-col gap-2">
              {parents.map((p) => {
                const isCurrent = p.id === currentId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      data-profile-id={p.id}
                      onClick={() => pick(p)}
                      className="ds-card ds-card-link flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <ProfileFace name={p.name} size="sm" current={isCurrent} editing={editing} />
                      <span className="min-w-0 flex-1 truncate text-headline text-label">
                        {editing && <span className="sr-only">Edit </span>}
                        {p.name}
                        {isCurrent && !editing && <span className="sr-only">, current profile</span>}
                      </span>
                      <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 text-supporting" />
                    </button>
                  </li>
                );
              })}
              {parents.length === 0 && !editing && (
                <li>
                  {canAddParent ? (
                    <Link href={addHref("parent")} className="ds-card ds-card-link flex w-full items-center gap-3 px-4 py-3">
                      <AddParentInner />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => setUpgradeOpen(true)} className="ds-card ds-card-link flex w-full items-center gap-3 px-4 py-3 text-left">
                      <AddParentInner family={family} />
                    </button>
                  )}
                </li>
              )}
            </ul>
          </section>
        </div>

        {!editing && (
          <div className="flex flex-col items-center gap-3 pt-2">
            {accountEmail ? (
              <p className="flex items-center gap-1.5 text-subheadline text-supporting">
                <Cloud aria-hidden="true" strokeWidth={1.75} className="size-4" />
                Synced to {accountEmail}
              </p>
            ) : (
              !canGoBack && (
                <Link href="/auth/login" className="text-subheadline font-semibold text-rust-on-tint underline-offset-4 hover:underline">
                  Sign in to sync
                </Link>
              )
            )}
            {current && (
              <Button size="lg" className="w-full max-w-[22rem]" onClick={() => onSelect(current)}>
                Continue with {current.name}
              </Button>
            )}
          </div>
        )}
      </main>

      <CardDialog
        open={!!editingProfile}
        onOpenChange={(o) => { if (!o) closeEdit(); }}
        title={confirmDelete && editingProfile ? `Delete ${editingProfile.name}?` : "Edit profile"}
        returnFocusTo={returnRef}
      >
        {editingProfile && (confirmDelete ? (
          <DeleteProfileConfirm
            profile={editingProfile}
            signedIn={!!accountEmail}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => handleDelete(editingProfile)}
          />
        ) : (
          <EditProfileForm
            key={editingProfile.id}
            profile={editingProfile}
            profiles={profiles}
            family={family}
            idPrefix="edit-profile"
            onSave={async (p) => {
              await onSave(p);
              closeEdit();
            }}
            footer={
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="self-start rounded-full py-2 text-subheadline font-semibold text-danger underline-offset-4 hover:underline"
              >
                Delete {editingProfile.name}
              </button>
            }
          />
        ))}
      </CardDialog>

      <CardDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Add more profiles with Family"
        description={`Family Annual includes one parent or guardian and up to ${FAMILY_KID_LIMIT} kids, each with their own notes.`}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/note/pricing">See Family plan</Link>
          </Button>
          <Button variant="secondary" onClick={() => setUpgradeOpen(false)}>Not now</Button>
        </div>
      </CardDialog>
    </>
  );
}

function AddTile({ label, line, href, disabled, onUpgrade }: {
  label: string;
  line: string;
  href: string | null;
  disabled: boolean;
  onUpgrade: () => void;
}) {
  const inner = (
    <>
      <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-supporting">
        <Plus strokeWidth={1.75} className="size-7" />
      </span>
      <span className="flex flex-col items-center">
        <span className="text-headline text-label">{label}</span>
        <span className="text-subheadline text-supporting">{line}</span>
      </span>
    </>
  );
  const cls = "flex w-full flex-col items-center gap-2 rounded-2xl px-1 py-2 hover:bg-hover-fill";
  if (disabled) {
    return <div className={cls.replace(" hover:bg-hover-fill", "")}>{inner}</div>;
  }
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onUpgrade} className={cls}>{inner}</button>;
}

function AddParentInner({ family = true }: { family?: boolean }) {
  return (
    <>
      <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-dashed border-input text-supporting">
        <Plus strokeWidth={1.75} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-headline text-label">Add parent profile</span>
        {!family && <span className="text-subheadline text-supporting">With Family Plan</span>}
      </span>
      <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 text-supporting" />
    </>
  );
}
