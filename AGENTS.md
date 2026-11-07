<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## QuizliAI web design contract (binding for every UI change)

Source docs (claude.ai QuizliAI project): `claude/quizliai-visual-direction-lock-2026-11-02.md` (palette, families, rules; do not reopen) and `claude/quizliai-web-design-standards-2026-11-06.md` (rule ids W-x.y; cite them in review comments). Approved desktop Home: Option A (canvas "QuizliAI Web Home Shell", 2026-11-06).

### Tokens (app/globals.css is the only place colors live)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--home-top` / `--home-bottom` | #E4EEFB / #E6F4EA | #121A24 / #11201A | Home, folders, recent |
| `--study-top` / `--study-bottom` | #E3F2E8 / #D9ECE2 | #0F1C16 / #0D1813 | Note, flashcards, quiz, games, arcade |
| `--people-top` / `--people-bottom` | #ECE8F8 / #E2E0F5 | #171428 / #141224 | Profiles, settings |
| `--welcome-top` / `--welcome-bottom` | #E4EEFB / #ECE6F7 | #121A24 / #171428 | Onboarding, paywall |
| `--card` | #FFFFFF | #1C1C1E | Cards (16 radius; shadow light, 1px white 10% stroke dark) |
| `--paper` / `--on-paper` | #FBF7EE / #1D1D1F | same | Index cards |
| `--primary-fill` / hover / active | #B85818 / #A34E14 / #9E4A12 | same | Rust capsule, white text (W-2.3) |
| `--rust` | #B85818 | #D0702E | Rust text and icons on cards |
| `--rust-on-tint` | #9E4A12 | #D0702E | Rust text directly on a family tint |
| `--text-supporting` | #5A5A60 | rgb(235 235 245 / .64) | Secondary text |
| `--ring` | #9E4A12 | #D0702E | Focus outline |
| `--input-border` | #7C7C80 | #8E8E93 | Inputs, checkboxes |
| `--danger-text` | #C4161C | #FF6961 | Error text and error border |
| `--success` / `--warning` | #248A3D / #C93400 | #30D158 / #FF9F0A | Got it and Review again marks: icons and borders only, never text on a tint (#C93400 is 4.29:1 on the study tint) |
| `--success-on-paper` / `--warning-on-paper` | #248A3D / #C93400 | same | Swipe stamps on the paper card (icons and large bold text) |

Tailwind names: `bg-card`, `text-label`, `text-supporting`, `text-rust`, `text-rust-on-tint`, `bg-rust-wash`, `text-danger`, `text-success`, `text-warning`, `bg-paper`, `text-on-paper`, `border-divider`, `border-card-stroke`, `bg-hover-fill`, `bg-control`, `bg-track`, `shadow-card`; shadcn names (`bg-primary`, `text-muted-foreground`, `border-input`, `ring`) map onto these. Type: `text-large-title`, `text-title`, `text-title2`, `text-title3`, `text-headline`, `text-body`, `text-callout`, `text-subheadline` (content floor), `text-footnote` (metadata only). Fonts: `font-sans` (system-ui), `font-serif` (ui-serif, then Source Serif 4 via next/font).

### Hard rules (yes/no checks)

1. Hard-coded hex in `app/` or `components/`: 0. violet, purple or indigo classes: 0 (screens are cleaned in PRs 2 to 6; new code adds none). Landing-only `c-*` tokens are retired in PR 6.
2. `#D0702E` is never a background behind white text. The capsule fill is `#B85818` in both modes.
3. One rust primary capsule above the fold per screen. One serif line per screen. Radius 22 (`rounded-[1.375rem]`) only on the one hero object.
4. Every route renders inside `AppShell` (`components/app/shell/AppShell.tsx`) with its family, or, for onboarding and paywall, a `family-surface family-<name>` layer. Pages render `<main id="main">` and exactly one `<h1>`.
5. Icons: lucide-react, stroke 1.75, `aria-hidden` when decorative. `components/app/Icon.tsx` maps the old Material names for existing call sites; new code imports lucide directly. No icon fonts, no Google Fonts links.
6. Theme: next-themes only (`defaultTheme="system"`). Never write the `dark` class yourself.
7. Focus: never `outline-none` without the global `:focus-visible` outline taking over; no `focus:ring-*` replacements.
8. Hover only through `hover:`; nothing reachable only on hover. Targets ≥ 24px (fine pointer), ≥ 44px under `pointer: coarse`.
9. Motion 150 to 250 ms, `ease-[cubic-bezier(0.2,0,0,1)]`; under reduced motion nothing animates `transform`.
10. A page that shows data takes it as props from a view component, so `/dev/fixtures/<family>` can render it with sample data. Fixture routes 404 in production.
11. Before review: screenshots of the family fixture at 1440×900 and 390×844, light and dark; axe serious and critical 0; horizontal scroll at 320, 360, 390, 768, 1024, 1440: 0.
12. Study modes (`components/app/study/StudySurface.tsx`) are full-screen on the study tint, with `<main id="main">` and one `<h1>`. Single-key shortcuts go through the surface's `onKeyDown`, never a window listener (W-5.6). Every swipe has a button (W-5.7). Dialogs use `CardDialog`, which returns focus to the opener.
13. Sketched on web is view-only (drawings made on iPhone). Never add a generate action on web. The nav item and Home card stay behind `NEXT_PUBLIC_SKETCHED_WEB=1` until the read route is confirmed.
14. People family (profiles, create profile, settings): profile reads and writes go through `lib/profileStore.ts` (name rules, delete cleanup, Firestore mirror). Forms use `components/app/people/FormKit.tsx` (W-7 field, error summary, banner, radio cards). Faces are paper circles with a serif initial (`ProfileFace`); no color avatars.
15. Welcome family (`/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/note/pricing`, `/note/subscription/success`): full-screen on `family-welcome` through `WelcomeFrame`, no app shell. Views in `components/app/welcome/` take props only; pages own Firebase and Stripe. Forms reuse `FormKit` and the `authFailure` mapping from `SignInPanel` (no toasts for errors). Pricing below 1024 px is the iOS paywall port; at 1024+ it is the split layout AR approved on 2026-11-06. Fixtures: `/dev/fixtures/welcome?state=login|signup|forgot|forgot-sent|success|processing` and `/dev/fixtures/paywall[?state=current]`. The paywall modal (`components/app/PaywallModal.tsx`, opened from the generate form) is one column in `CardDialog` at every width, Family preselected and listed first, every plan visible, unselected rows compact; it shares plan rows, features and the price sentence with pricing through `components/app/welcome/planParts.tsx`. Fixture: `/dev/fixtures/paywall-modal[?state=limit|nolimit|error|busy]`.
16. Landing `/` (`components/landing/`, `components/site-header.tsx`, `components/site-footer.tsx`): welcome family, sections max 1200 px (W-3.1). The live demo is the hero object beside the copy at 1024+ (AR picked this over a card-deck hero, 2026-11-07). The h1 is the serif line; `text-display` (3.5rem) is for the landing h1 at 1024+ only. Every word above the fold is server-rendered. Budgets (standards section 11): First Load JS for `/` ≤ 150 KB, font bytes ≤ 80 KB, Lighthouse mobile Performance ≥ 90 and Accessibility ≥ 95. The bear appears only in the demo's generating and correct-answer states. Landing copy names live features only.
