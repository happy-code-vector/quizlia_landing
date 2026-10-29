import { NextRequest, NextResponse } from "next/server";
import { meterGeneration } from "@/lib/quota";
import { exchangeRefreshToken } from "@/lib/token-verify";
import {
  verifyAppCheck,
  appCheckErrorResponse,
  resolveAccountCaller,
  resolveDeviceCaller,
  devicePlan,
  type DeviceCaller,
} from "@/lib/caller";
import { meterDeviceGeneration } from "@/lib/devices";
import { getTranscript, youtubeVideoId } from "@/lib/transcript";
import { timingLog } from "@/lib/timing";
import { checkBudget, recordSpend, budgetKeyFor, resolveAccountBudget, estimateCents, type BudgetPlan } from "@/lib/budget";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PRD F2: a YouTube link becomes a note plus a three-question quiz, written
// from the video's own captions (never guessed from the title or URL).
//
// POST { url, goal?, audience? }
//   -> 200 { videoId, topic, summary, sections[], quiz[] }
//   -> 401 not signed in · 422 no_captions / bad_link · 429 quota · 502 model
//
// Metering: this is the user's free note (PRD section 8). It is charged only
// after a transcript is found, and `setId` keeps retries of the same video
// on the same day from charging twice. Signed-out devices (X-Device-ID,
// lib/caller) meter at the same checkpoint via lib/devices.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-5-5";
const MAX_TRANSCRIPT_CHARS = 120_000;

type QuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
  explanations: string[];
};

type StudyResult = {
  topic: string;
  summary: string;
  sections: { heading: string; points: string[] }[];
  quiz: QuizItem[];
};

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function buildPrompt(transcript: string, goal: string, audience: string) {
  return `You are writing study material from a YouTube video's transcript for a student${
    audience === "parent" ? " whose parent is setting up the app" : ""
  }.${goal ? ` The learner is studying for: ${goal}.` : ""}

Use ONLY facts stated in the transcript. Do not add outside facts, dates or numbers that the transcript does not contain. If the transcript is jokey, keep the facts and drop the jokes.

Return ONLY a JSON object, no prose and no code fences, in exactly this shape:
{
  "topic": "short topic title, under 8 words",
  "summary": "two plain sentences on what the video covers",
  "sections": [
    { "heading": "short heading", "points": ["one fact per point", "..."] }
  ],
  "quiz": [
    {
      "question": "one clear question",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "explanations": [
        "why option A is right or wrong, one or two sentences, citing what the video said",
        "same for B", "same for C", "same for D"
      ]
    }
  ]
}

Rules: 3 to 5 sections with 2 to 4 points each. Exactly 3 quiz questions, each with 4 options and exactly one correct answer. Wrong options must be plausible. Each explanation names the specific fact from the video that makes that option right or wrong. Vary which position holds the correct answer.

Transcript:
"""
${transcript}
"""`;
}

function parseResult(raw: string): StudyResult | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as StudyResult;
    const quizOk =
      Array.isArray(data.quiz) &&
      data.quiz.length === 3 &&
      data.quiz.every(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) && q.options.length === 4 &&
          Array.isArray(q.explanations) && q.explanations.length === 4 &&
          Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4
      );
    const notesOk =
      typeof data.topic === "string" &&
      typeof data.summary === "string" &&
      Array.isArray(data.sections) && data.sections.length > 0;
    return quizOk && notesOk ? data : null;
  } catch {
    return null;
  }
}

async function callModel(
  prompt: string
): Promise<{ result: StudyResult | null; usage: { in: number; out: number } }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    console.error("study-from-video: model", res.status, await res.text());
    return { result: null, usage: { in: 0, out: 0 } };
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("");
  return {
    result: parseResult(text),
    usage: { in: data.usage?.input_tokens ?? 0, out: data.usage?.output_tokens ?? 0 },
  };
}

export async function POST(request: NextRequest) {
  // Item 65: this route has no pre-metering transcript check, so its
  // transcriptMs is the real fetch cost (getTranscript also logs its own
  // line). totalMs includes auth and metering — the user-perceived time.
  const startedAt = Date.now();
  if (!ANTHROPIC_API_KEY) return error(500, "not_configured", "Model key not configured");

  // Account tokens win; signed-out devices fall through to the device path.
  try {
    await verifyAppCheck(request);
  } catch (error) {
    const response = appCheckErrorResponse(error);
    if (response) return response;
    throw error;
  }
  const caller = await resolveAccountCaller(request);
  let device: DeviceCaller | null = null;
  if (!caller) {
    device = await resolveDeviceCaller(request);
    if (!device) return error(401, "unauthenticated", "Not authenticated");
  }

  let body: { url?: string; goal?: string; audience?: string };
  try {
    body = await request.json();
  } catch {
    return error(400, "bad_request", "Invalid JSON");
  }

  const videoId = youtubeVideoId(body.url || "");
  if (!videoId) return error(422, "bad_link", "That doesn't look like a YouTube link.");

  const transcriptStartedAt = Date.now();
  const transcript = await getTranscript(videoId);
  const transcriptMs = Date.now() - transcriptStartedAt;
  if (!transcript) {
    timingLog("generation", {
      source: "youtube",
      route: "study-from-video",
      ok: 0,
      error: "no_captions",
      transcriptMs,
      totalMs: Date.now() - startedAt,
    });
    return error(422, "no_captions", "This video has no captions we can read. Try another video or the sample.");
  }

  if (device) {
    const meter = await meterDeviceGeneration(device.deviceId, devicePlan(device.entitlement), `video-${videoId}`);
    if (!meter.ok) return error(meter.status, "quota", meter.message);
  } else if (caller) {
    const token = (request.headers.get("authorization") || "").startsWith("Bearer ")
      ? (request.headers.get("authorization") || "").slice(7)
      : await exchangeRefreshToken(request.headers.get("x-firebase-refresh") || "");
    const quota = await meterGeneration(token || "", caller.uid, `video-${videoId}`);
    if (!quota.ok) return error(quota.status, "quota", quota.message);
  }

  const prompt = buildPrompt(
    transcript.text.slice(0, MAX_TRANSCRIPT_CHARS),
    (body.goal || "").slice(0, 80),
    body.audience === "parent" ? "parent" : "student"
  );

  // Margin floor (items 22-24) — this route's model is Haiku. Enforce on
  // the purchase key (device entitlement or mirrored account); record all
  // entitled callers.
  const budget = device?.entitlement
    ? { key: budgetKeyFor(device.entitlement), plan: (device.entitlement.productField === "weekly" ? "weekly" : device.entitlement.plan) as BudgetPlan }
    : caller
      ? await resolveAccountBudget(caller.uid)
      : null;
  if (budget?.plan) {
    const check = await checkBudget(
      budget.key,
      budget.plan,
      estimateCents("claude-haiku-5-5", Math.ceil(Math.min(transcript.text.length, MAX_TRANSCRIPT_CHARS) / 4), 4000)
    );
    if (!check.ok) {
      timingLog("generation", {
        source: "youtube", route: "study-from-video", ok: 0, error: "budget_reached",
        transcriptMs, totalMs: Date.now() - startedAt,
      });
      return error(429, "budget_reached", check.message);
    }
  }

  // One retry on malformed output; the user never sees a made-up note.
  const modelStartedAt = Date.now();
  const first = await callModel(prompt);
  const second = first.result ? null : await callModel(prompt);
  const result = first.result ?? second?.result ?? null;
  const usage = second?.usage ?? first.usage;
  const modelMs = Date.now() - modelStartedAt;
  if (budget && (usage.in || usage.out)) {
    await recordSpend(budget.key, budget.plan ?? "family", "claude-haiku-5-5", usage.in, 0, usage.out);
  }
  timingLog("generation", {
    source: "youtube",
    route: "study-from-video",
    ok: result ? 1 : 0,
    transcriptMs,
    modelMs,
    totalMs: Date.now() - startedAt,
  });
  if (!result) return error(502, "model_failed", "We couldn't build your notes this time. Please try again.");

  // Item 5: the app saves sourceText locally (never Firestore-synced —
  // the 1 MiB doc limit, item 17) and uses it as the tutor's source_text.
  return NextResponse.json({
    videoId,
    transcriptSource: transcript.source,
    sourceText: transcript.text,
    sourceKind: "transcript",
    ...result,
  });
}
