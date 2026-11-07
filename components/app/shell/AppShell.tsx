"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown, FileText, Folder, Gamepad2, House, Menu, PanelLeftClose, PanelLeftOpen,
  PenLine, Settings, type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UsageIndicator } from "@/components/app/UsageIndicator";
import { localFoldersKey } from "@/lib/folderSync";

export type Family = "home" | "study" | "people" | "welcome";

export interface ShellProfile {
  id: number;
  name: string;
  type?: string;
  avatar?: string;
}

export interface ShellFolder {
  id: string;
  name: string;
  count: number;
}

interface AppShellProps {
  profile: ShellProfile | null;
  family: Family;
  children: React.ReactNode;
  /** Fixture routes pass folders directly; real pages read the local cache. */
  folders?: ShellFolder[];
  /** Fixture routes skip the live usage meter (it reads localStorage). */
  hideUsage?: boolean;
}

/** Web never generates Sketched visuals; it only shows ones made on iPhone. Off until the read route ships. */
export const SKETCHED_WEB = process.env.NEXT_PUBLIC_SKETCHED_WEB === "1";

const STROKE = 1.75;
const EXPANDED_KEY = "sidebarExpanded";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  match: (p: string) => boolean;
}

const NAV: NavItem[] = [
  { href: "/note", label: "Home", Icon: House, match: (p) => p === "/note" },
  { href: "/note/notes", label: "All notes", Icon: FileText, match: (p) => p.startsWith("/note/notes") },
  ...(SKETCHED_WEB
    ? [{ href: "/note/sketched", label: "Sketched", Icon: PenLine, match: (p: string) => p.startsWith("/note/sketched") }]
    : []),
  { href: "/note/arcade", label: "Arcade", Icon: Gamepad2, match: (p) => p.startsWith("/note/arcade") || p.startsWith("/note/play") },
];

function readLocalFolders(profileId: number): ShellFolder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(localFoldersKey(profileId)) || "[]") as Array<{
      id: string; name: string; deletedAt?: string | null;
    }>;
    const content = JSON.parse(localStorage.getItem(`content_${profileId}`) || "[]") as Array<{
      folderId?: string | number; sourceId?: string; id: number | string;
    }>;
    return raw
      .filter((f) => !f.deletedAt)
      .map((f) => {
        const notes = new Set(
          content.filter((c) => String(c.folderId ?? "") === f.id).map((c) => c.sourceId || `legacy_${c.id}`),
        );
        return { id: f.id, name: f.name, count: notes.size };
      });
  } catch {
    return [];
  }
}

function useFolders(profile: ShellProfile | null, given?: ShellFolder[]) {
  const [folders, setFolders] = useState<ShellFolder[]>(given ?? []);
  useEffect(() => {
    if (given || !profile) return;
    const load = () => setFolders(readLocalFolders(profile.id));
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [profile, given]);
  return given ?? folders;
}

/**
 * W-3 shell. Phone (< 768): 56px top bar, nav in a left sheet. Tablet (768 to 1023): 80px rail.
 * Desktop (>= 1024): 256px sidebar, collapsible to the rail, state in localStorage.
 * The page renders its own <main id="main"> inside children.
 */
export function AppShell({ profile, family, children, folders: givenFolders, hideUsage }: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [expanded, setExpanded] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const folders = useFolders(profile, givenFolders);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXPANDED_KEY);
      if (stored !== null) setExpanded(stored === "true");
    } catch {}
  }, []);

  const toggle = () => {
    setExpanded((v) => {
      try { localStorage.setItem(EXPANDED_KEY, String(!v)); } catch {}
      return !v;
    });
  };

  const initial = profile?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-dvh flex-col overflow-hidden md:flex-row">
        <a href="#main" className="skip-link">Skip to content</a>
        <div aria-hidden="true" className={`family-surface family-${family}`} />

        {/* Phone top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-divider px-2 md:hidden" style={{ background: `var(--${family}-top)` }}>
          <div className="flex items-center">
            <IconButton label="Open menu" onClick={() => setSheetOpen(true)}>
              <Menu aria-hidden="true" strokeWidth={STROKE} className="size-5" />
            </IconButton>
            <Link
              href="/note/profile-selection"
              aria-label={profile ? `Switch profile, current profile ${profile.name}` : "Choose a profile"}
              className="relative flex size-11 items-center justify-center rounded-full"
            >
              <Monogram initial={initial} />
            </Link>
          </div>
          <Link href="/note/settings" aria-label="Settings" className="flex size-11 items-center justify-center rounded-full text-supporting">
            <span className="flex size-[2.125rem] items-center justify-center rounded-full border border-card-stroke bg-card">
              <Settings aria-hidden="true" strokeWidth={STROKE} className="size-[1.125rem]" />
            </span>
          </Link>
        </header>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="left"
            className="w-[18rem] border-r border-divider p-0"
            style={{ background: `var(--${family}-top)` }}
            onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setSheetOpen(false); }}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <NavBody
              expanded
              pathname={pathname}
              profile={profile}
              initial={initial}
              folders={folders}
              hideUsage={hideUsage}
            />
          </SheetContent>
        </Sheet>

        {/* Tablet rail and desktop sidebar */}
        <nav
          aria-label="Main"
          className={`hidden shrink-0 border-r border-divider md:flex md:w-20 ${expanded ? "lg:w-64" : "lg:w-20"}`}
          style={{ background: `var(--${family}-top)` }}
        >
          <NavBody
            expanded={expanded}
            pathname={pathname}
            profile={profile}
            initial={initial}
            folders={folders}
            hideUsage={hideUsage}
            onToggle={toggle}
            railBelowLg
          />
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </TooltipProvider>
  );
}

function Monogram({ initial }: { initial: string }) {
  return (
    <span aria-hidden="true" className="flex size-[2.125rem] shrink-0 items-center justify-center rounded-full bg-rust-wash text-subheadline font-semibold text-rust-on-tint">
      {initial}
    </span>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-11 items-center justify-center rounded-full text-supporting hover:text-label">
      {children}
    </button>
  );
}

interface NavBodyProps {
  expanded: boolean;
  pathname: string;
  profile: ShellProfile | null;
  initial: string;
  folders: ShellFolder[];
  hideUsage?: boolean;
  onToggle?: () => void;
  /** In the md..lg range the sidebar is always a rail, whatever the stored state. */
  railBelowLg?: boolean;
}

function NavBody({ expanded, pathname, profile, initial, folders, hideUsage, onToggle, railBelowLg }: NavBodyProps) {
  // Label visibility: in the sheet always; in the nav only at lg and when expanded.
  const showLabel = railBelowLg ? (expanded ? "hidden lg:inline" : "hidden") : "inline";
  const showBlock = railBelowLg ? (expanded ? "hidden lg:flex" : "hidden") : "flex";
  const tipHidden = railBelowLg ? (expanded ? "lg:hidden" : "") : "hidden";

  return (
    <div className="flex h-full w-full flex-col justify-between gap-4 overflow-y-auto px-3 py-5">
      <div className="flex flex-col gap-5">
        <div className={`flex items-center px-2 ${railBelowLg && expanded ? "justify-center lg:justify-between" : "justify-center"} ${!railBelowLg ? "!justify-start" : ""}`}>
          <span className={`${showLabel} text-headline tracking-tight`}>QuizliAI</span>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={expanded}
              className="hidden size-11 items-center justify-center rounded-full text-supporting hover:text-label lg:flex"
            >
              {expanded
                ? <PanelLeftClose aria-hidden="true" strokeWidth={STROKE} className="size-[1.125rem]" />
                : <PanelLeftOpen aria-hidden="true" strokeWidth={STROKE} className="size-[1.125rem]" />}
            </button>
          )}
        </div>

        <Tip label={profile ? `Switch profile (${profile.name})` : "Choose a profile"} hiddenClass={tipHidden}>
          <Link
            href="/note/profile-selection"
            aria-label={profile ? `Switch profile, current profile ${profile.name}` : "Choose a profile"}
            className="ds-card flex items-center justify-center gap-3 rounded-[0.875rem] p-2 hover:shadow-card-raised"
          >
            <Monogram initial={initial} />
            <span className={`${showBlock} min-w-0 flex-1 flex-col`}>
              <span className="truncate text-subheadline font-semibold">{profile?.name ?? "Profile"}</span>
              <span className="text-footnote text-supporting">Switch profile</span>
            </span>
            <ChevronsUpDown aria-hidden="true" strokeWidth={STROKE} className={`${showLabel} size-4 text-supporting`} />
          </Link>
        </Tip>

        <ul className="flex flex-col gap-0.5" role="list">
          {NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={item.match(pathname)} showLabel={showLabel} tipHidden={tipHidden} />
            </li>
          ))}
        </ul>

        {folders.length > 0 && (
          <div className={`${showBlock} flex-col gap-0.5`}>
            <h2 className="px-3 pb-1 text-footnote font-semibold text-supporting">Folders</h2>
            <ul className="flex flex-col gap-0.5" role="list">
              {folders.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/note/notes?folder=${encodeURIComponent(f.id)}`}
                    className="flex h-10 items-center gap-3 rounded-xl px-3 text-subheadline hover:bg-hover-fill"
                  >
                    <Folder aria-hidden="true" strokeWidth={STROKE} className="size-5 shrink-0 text-supporting" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="tabular text-footnote text-supporting">{f.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {!hideUsage && profile && (
          <div className={showBlock}>
            <div className="w-full"><UsageIndicator profileId={profile.id} /></div>
          </div>
        )}
        <NavLink
          item={{ href: "/note/settings", label: "Settings", Icon: Settings, match: (p) => p.startsWith("/note/settings") }}
          active={pathname.startsWith("/note/settings")}
          showLabel={showLabel}
          tipHidden={tipHidden}
        />
      </div>
    </div>
  );
}

function NavLink({ item, active, showLabel, tipHidden }: { item: NavItem; active: boolean; showLabel: string; tipHidden: string }) {
  const { Icon } = item;
  return (
    <Tip label={item.label} hiddenClass={tipHidden}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={showLabel === "inline" ? undefined : item.label}
        className={`flex h-10 items-center gap-3 rounded-xl px-3 text-subheadline ${
          active ? "ds-card rounded-xl font-semibold" : "hover:bg-hover-fill"
        }`}
      >
        <Icon aria-hidden="true" strokeWidth={STROKE} className={`size-5 shrink-0 ${active ? "text-rust" : "text-supporting"}`} />
        <span className={showLabel}>{item.label}</span>
      </Link>
    </Tip>
  );
}

function Tip({ label, hiddenClass, children }: { label: string; hiddenClass: string; children: React.ReactElement }) {
  if (hiddenClass === "hidden") return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className={hiddenClass}>{label}</TooltipContent>
    </Tooltip>
  );
}
