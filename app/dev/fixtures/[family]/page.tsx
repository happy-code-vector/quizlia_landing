import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FixtureClient } from "./FixtureClient";
import { FIXTURE_FAMILIES, type FixtureFamily } from "../sample-data";

// W-10: dev-only fixture routes for deterministic screenshots. Never served in production.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FixturePage({ params }: { params: Promise<{ family: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { family } = await params;
  if (!(FIXTURE_FAMILIES as readonly string[]).includes(family)) notFound();
  return <FixtureClient family={family as FixtureFamily} />;
}
