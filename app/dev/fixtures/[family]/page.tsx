import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FixtureClient } from "./FixtureClient";
import { FIXTURE_FAMILIES, type FixtureFamily } from "../sample-data";

// W-10: dev-only fixture routes for deterministic screenshots. Never served in production.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FixturePage({
  params,
  searchParams,
}: {
  params: Promise<{ family: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { family } = await params;
  if (!(FIXTURE_FAMILIES as readonly string[]).includes(family)) notFound();
  const { state } = await searchParams;
  // Home states: default (deck + Sketched), ?state=nosketch (flag off), ?state=empty (no deck).
  return <FixtureClient family={family as FixtureFamily} state={state} />;
}
