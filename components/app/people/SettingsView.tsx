"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, ChevronRight, Mail, Plus, Repeat } from "lucide-react";
import type { Profile } from "@/lib/types";
import { kindLabel } from "@/lib/profileStore";
import { AppShell, type ShellFolder } from "@/components/app/shell/AppShell";
import { ThemeSegmented } from "@/components/app/ThemeSegmented";
import { CardDialog } from "@/components/app/CardDialog";
import { Button } from "@/components/ui/button";
import { ProfileFace } from "./ProfileFace";
import { EditProfileForm } from "./ProfileFields";
import { DeleteProfileConfirm } from "./DeleteProfileConfirm";

import { SUPPORT_EMAIL } from "@/lib/support";
export { SUPPORT_EMAIL };

export interface PlanSummary {
  name: string;
  paid: boolean;
  /** ISO date the paid plan renews or ends. */
  renewsOn: string | null;
  features: string[];
  usage: { kind: "free"; noteLeft: boolean } | { kind: "daily"; used: number; limit: number } | { kind: "none" };
}

export interface SettingsViewProps {
  profile: Profile;
  profiles: Profile[];
  family: boolean;
  plan: PlanSummary;
  account: { email: string } | null;
  onSaveProfile: (p: Profile) => Promise<void>;
  onDeleteProfile: () => Promise<void>;
  onSignOut: () => Promise<void>;
  /** The promo code field; fixtures pass a static one. */
  promo: React.ReactNode;
  folders?: ShellFolder[];
  hideUsage?: boolean;
}

/**
 * Settings on the people family. One page of sections instead of the old three tabs, so nothing is
 * hidden behind a tab and the System/Light/Dark control (W-8.2) is always in view. Help sits here (W-9.5).
 */
export function SettingsView({
  profile, profiles, family, plan, account, onSaveProfile, onDeleteProfile, onSignOut, promo, folders, hideUsage,
}: SettingsViewProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);

  return (
    <AppShell profile={profile} family="people" folders={folders} hideUsage={hideUsage}>
      <main id="main" className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[45rem] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          <h1 tabIndex={-1} className="font-serif text-title font-semibold lg:text-large-title">Settings</h1>

          <Section id="profile" title="Profile">
            <div className="flex items-center gap-3">
              <ProfileFace name={profile.name} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-headline text-label">{profile.name}</span>
                <span className="text-subheadline text-supporting">{kindLabel(profile)}</span>
              </div>
            </div>
            <EditProfileForm
              key={`${profile.id}-${profile.name}-${profile.type}`}
              profile={profile}
              profiles={profiles}
              family={family}
              idPrefix="settings-profile"
              onSave={onSaveProfile}
            />
            <ul className="-mx-2 flex flex-col border-t border-divider pt-2">
              <RowLink href="/note/profile-selection" icon={<Repeat aria-hidden="true" strokeWidth={1.75} className="size-5" />}>
                Switch profile
              </RowLink>
              <RowLink href="/note/create-profile?add=1" icon={<Plus aria-hidden="true" strokeWidth={1.75} className="size-5" />}>
                Add a profile
              </RowLink>
            </ul>
          </Section>

          <Section id="appearance" title="Appearance">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col">
                <span id="theme-label" className="text-headline text-label">Theme</span>
                <span className="text-subheadline text-supporting">System follows your device setting.</span>
              </div>
              <ThemeSegmented labelledBy="theme-label" />
            </div>
          </Section>

          <Section id="plan" title="Plan">
            <div className="flex flex-col gap-1">
              <p className="text-title3 font-semibold text-label">{plan.name}</p>
              <p className="text-subheadline text-supporting">
                {plan.paid && plan.renewsOn
                  ? <>Active until <span className="tabular">{formatDate(plan.renewsOn)}</span></>
                  : plan.paid ? "Active" : "One free note to try QuizliAI."}
              </p>
            </div>

            <Usage usage={plan.usage} />

            <ul aria-label={`${plan.name} includes`} className="flex flex-col gap-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-subheadline text-label">
                  <Check aria-hidden="true" strokeWidth={2} className="mt-0.5 size-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>

            <Button asChild variant="secondary" className="self-start">
              <Link href="/note/pricing">{plan.paid ? "See all plans" : "See plans"}</Link>
            </Button>

            <div className="border-t border-divider pt-5">{promo}</div>

            {plan.paid && (
              <p className="text-subheadline text-supporting">
                To cancel or change your plan, email <a className="font-semibold text-rust underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
            )}
          </Section>

          <Section id="account" title="Account">
            {account ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-col">
                  <span className="text-subheadline text-supporting">Signed in as</span>
                  <span className="truncate text-headline text-label">{account.email}</span>
                </div>
                <Button
                  variant="secondary"
                  disabled={signingOut}
                  onClick={async () => {
                    setSigningOut(true);
                    try { await onSignOut(); } finally { setSigningOut(false); }
                  }}
                >
                  {signingOut ? "Signing out" : "Sign out"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-subheadline text-supporting">Profiles and notes are saved on this device only.</p>
                <Button asChild variant="secondary" className="self-start">
                  <Link href="/auth/login">Sign in to sync</Link>
                </Button>
              </div>
            )}
          </Section>

          <Section id="help" title="Help">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="-mx-2 flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-hover-fill">
              <Mail aria-hidden="true" strokeWidth={1.75} className="size-5 text-supporting" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-headline text-label">Contact us</span>
                <span className="truncate text-subheadline text-supporting">{SUPPORT_EMAIL}</span>
              </span>
              <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 text-supporting" />
            </a>
          </Section>

          <div className="flex flex-col items-start gap-1 px-1">
            <button
              ref={deleteRef}
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-full py-2 text-subheadline font-semibold text-danger underline-offset-4 hover:underline"
            >
              Delete {profile.name}
            </button>
            <p className="text-subheadline text-supporting">Removes this profile and its notes.</p>
          </div>
        </div>
      </main>

      <CardDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={`Delete ${profile.name}?`} returnFocusTo={deleteRef}>
        <DeleteProfileConfirm
          profile={profile}
          signedIn={!!account}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={onDeleteProfile}
        />
      </CardDialog>
    </AppShell>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="ds-card flex flex-col gap-5 p-5 sm:p-6">
      <h2 id={`${id}-heading`} className="text-title3 font-semibold text-label">{title}</h2>
      {children}
    </section>
  );
}

function RowLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-headline text-label hover:bg-hover-fill">
        <span className="text-supporting">{icon}</span>
        <span className="flex-1">{children}</span>
        <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 text-supporting" />
      </Link>
    </li>
  );
}

function Usage({ usage }: { usage: PlanSummary["usage"] }) {
  if (usage.kind === "none") return null;
  if (usage.kind === "free") {
    return (
      <p className="text-subheadline text-label">
        {usage.noteLeft ? "You have 1 free note left." : "You have used your free note. Choose a plan to make more notes."}
      </p>
    );
  }
  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span id="usage-label" className="text-subheadline text-label">Notes made today</span>
        <span className="tabular text-subheadline font-semibold text-label">{usage.used} of {usage.limit}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="usage-label"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.used}
        aria-valuetext={`${usage.used} of ${usage.limit}`}
        className="h-2 overflow-hidden rounded-full bg-track"
      >
        <div className="h-full rounded-full bg-rust" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-subheadline text-supporting">Resets at midnight.</p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
