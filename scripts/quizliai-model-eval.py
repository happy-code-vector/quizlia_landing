#!/usr/bin/env python3
"""QuizliA model eval (handoff item 12).

Gemini 3.1 Flash-Lite vs Claude Haiku 5.5 on real study videos: one
study-pack generation + six tutor-style chat questions per video per
model, plus a support check (hallucination pass) on every pack. Mirrors
the LIVE server behavior — lib/generate-core.ts prompts (v2, section 6
bands), lib/chat-core.ts chat contract, and the same generation params
(no thinkingConfig on Gemini, maxOutputTokens 65536; Haiku max_tokens
4000 as on /api/ios/study-from-video). Usage:

    python scripts/quizliai-model-eval.py                # 20 videos, full
    python scripts/quizliai-model-eval.py --limit 2      # smoke run
    python scripts/quizliai-model-eval.py --skip-verify  # skip hallucination pass

Reads GEMINI_API_KEY / ANTHROPIC_API_KEY / SUPADATA_API_KEY from .env.
Writes out/eval/results.json and out/eval/summary.md. Transcripts cache
on disk under out/eval/transcripts/ so reruns cost nothing to refetch.
Full 20-video run costs roughly $0.20-0.30 at AR's 2026-10-20 prices.
"""
import argparse
import json
import pathlib
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "eval"

# Prices per 1M tokens (AR, verified 2026-10-20): (input, cached-input, output)
PRICES = {
    "gemini": (0.25, 0.025, 1.50),
    "haiku": (0.10, 0.01, 0.50),
}
GEMINI_MODEL = "gemini-3.1-flash-lite"
HAIKU_MODEL = "claude-haiku-5-5"

SEARCH_QUERIES = [
    "photosynthesis explained", "world war 2 history", "python loops tutorial",
    "fractions basics", "the water cycle", "roman empire", "human digestive system",
    "algebra basics", "ancient egypt", "electric circuits explained",
    "french revolution", "cell division mitosis", "shakespeare romeo and juliet",
    "chemical reactions", "gravity explained", "american civil war",
    "grammar parts of speech", "geometry angles", "nervous system", "volcanoes",
]

# Section 6 bands (AR, locked 2026-10-21) — same thresholds the server uses
# (lib/generate-core.ts: ~150 spoken words per minute).
BANDS = [("5 to 8", "3 to 5"), ("8 to 15", "5 to 8"), ("15 to 25", "8 to 12"), ("25 to 40", "12 to 20")]
BAND_RANGES = [((5, 8), (3, 5)), ((8, 15), (5, 8)), ((15, 25), (8, 12)), ((25, 40), (12, 20))]

CHAT_QUESTIONS = [
    "What is the main idea of this video?",
    "Explain one key concept from the video in detail.",
    "What cause-and-effect relationship does the video describe?",
    "Summarize the conclusion of the video.",
    "What example does the video give, and what does it show?",
    "What is one thing the video says is worth remembering?",
]

STUDY_PACK_TEMPLATE = """You are QuicNotes, an AI that produces a complete study pack from the given content.

TASK:
Produce all three deliverables in ONE JSON response:
1. Structured study notes (same schema as the "note" task below).
2. Study flashcards — {CARDS}, high quality, no filler.
3. Multiple-choice quiz questions — {QUESTIONS}, high quality, no filler.

NOTE SCHEMA:
- title: string (concise title of the content)
- quick_summary: string (a 5–8 sentence overall summary)
- key_findings: array of strings (as many key facts or statistics as possible)
- important_notes: array of strings (all relevant cautions, limitations, or extra details you can find)
- sections: array of cheat-sheet sections — the detailed study material, organized topic by topic (3–8 sections, each with a short descriptive title, clear explanatory content, and up to 5 key terms)

FLASHCARD SCHEMA (each): { "question": string (clear, concise; preferably under 20 words), "answer": string (short, precise, factual) }

QUIZ SCHEMA (each): { "question": string (under 25 words), "options": array of 4 distinct strings, "correct_answer": string (must exactly match one option), "explanation": string (1–2 sentences) }

RULES:
- Answers must be based only on the provided content.
- No duplicates or trivial items. Only one correct answer per quiz question.
- Distractors must be plausible but clearly wrong.
- If you cannot access or analyze the content, return: {"error": "content_not_accessible", "message": "Unable to access or analyze the provided content"}

RESPONSE FORMAT (JSON only):
{
  "note": { "title": "string", "quick_summary": "string", "key_findings": ["..."], "important_notes": ["..."], "sections": [ { "title": "section title", "content": "explanatory text", "keyTerms": ["term 1", "term 2"] } ] },
  "flashcards": [ { "question": "string", "answer": "string" } ],
  "quizzes": [ { "question": "string", "options": ["string","string","string","string"], "correct_answer": "string", "explanation": "string" } ]
}"""

JSON_FORMAT_CONTRACT = """FORMAT:
- The JSON itself must stay plain: no markdown fences, no text outside the JSON.
- Inside explanatory prose values (section content, quick_summary, quiz explanations) use only: **bold**, *italic*, "- " bullet lists, "1. " numbered lists, blank lines between paragraphs.
- Keep titles, captions, key findings and important-notes items, flashcard questions/answers, and quiz questions/options plain — no emphasis or list markers.
- Never use headings (#), tables, code blocks, links, images, or any other markdown syntax."""

CHAT_TEMPLATE = """Document Context:
{context}

User Question:
{question}

Instructions:
- Answer based ONLY on the information provided in the document context above
- Search thoroughly through the context for relevant information, including synonyms and related terms
- If the specific information is not mentioned in the document, respond politely: "I don't see information about [specific topic] in the shared document. Could you check if this information is available in another section or document?"
- For follow-up questions, re-examine the entire context carefully before concluding information is missing
- Be thorough in your search through the context before determining information is not mentioned
- Never make up or assume information not explicitly stated in the context

FORMAT:
- Use only these formatting constructs: **bold** for key terms, *italic* for emphasis, "- " for bullet lists, "1. " for numbered lists, and blank lines between paragraphs.
- Never use headings (#), tables, code blocks, links, images, or any other markdown syntax."""

VERIFY_TEMPLATE = """You are checking a study pack against its source. Below are a video transcript and the study items another model produced from it.

Transcript:
\"\"\"
{transcript}
\"\"\"

Study items (numbered):
{items}

For each numbered item, decide whether its answer (flashcard answer, or the quiz correct_answer and explanation) is supported by the transcript. List the numbers of EVERY item that states anything the transcript does not say, quoting the unsupported part. If every item is supported, reply with exactly: NONE"""

ENV = {}


def http_json(url, payload=None, headers=None, timeout=90):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST" if data is not None else "GET",
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = json.loads(res.read().decode("utf-8"))
        return body, (time.time() - t0) * 1000, None
    except urllib.error.HTTPError as e:
        return None, (time.time() - t0) * 1000, f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:200]}"
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return None, (time.time() - t0) * 1000, f"{type(e).__name__}: {e}"


def call_gemini(prompt, max_tokens):
    body, ms, err = http_json(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={ENV['GEMINI_API_KEY']}",
        {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"maxOutputTokens": max_tokens}},
    )
    if err:
        return "", {"in": 0, "out": 0, "cached": 0, "thought": 0}, ms, err
    usage = body.get("usageMetadata", {})
    text = ""
    try:
        text = body["candidates"][0]["content"]["parts"][0]["text"] or ""
    except (KeyError, IndexError):
        err = "no candidate text"
    return text, {
        "in": usage.get("promptTokenCount", 0),
        "out": usage.get("candidatesTokenCount", 0),
        "cached": usage.get("cachedContentTokenCount", 0),
        "thought": usage.get("thoughtsTokenCount", 0),
    }, ms, err


def call_haiku(prompt, max_tokens):
    body, ms, err = http_json(
        "https://api.anthropic.com/v1/messages",
        {"model": HAIKU_MODEL, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]},
        headers={"x-api-key": ENV["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"},
    )
    if err:
        return "", {"in": 0, "out": 0, "cached": 0, "thought": 0}, ms, err
    usage = body.get("usage", {})
    text = "".join(b.get("text", "") for b in body.get("content", []) if b.get("type") == "text")
    return text, {
        "in": usage.get("input_tokens", 0),
        "out": usage.get("output_tokens", 0),
        "cached": usage.get("cache_read_input_tokens", 0) or 0,
        "thought": 0,
        # Haiku runs adaptive thinking by default (no param sent, mirroring
        # the server) — thinking tokens are inside output_tokens and billed
        # as output. stop_reason "max_tokens" means truncation.
        "stop_reason": body.get("stop_reason", ""),
    }, ms, err


def band_for(words):
    if words < 450:
        return 0
    if words < 1500:
        return 1
    if words < 4500:
        return 2
    return 3


def count_words(text):
    return len([w for w in text.split() if w])


def search_videos():
    # Cached on disk: searches count against the Supadata plan limit (the
    # pool never changes between runs — don't pay for it twice).
    pool_cache = OUT / "pool.json"
    if pool_cache.exists():
        return json.loads(pool_cache.read_text(encoding="utf-8"))
    pool = {}
    for q in SEARCH_QUERIES:
        body, _, err = http_json(
            "https://api.supadata.ai/v1/youtube/search?"
            + urllib.parse.urlencode({"query": q, "limit": 4}),
            headers={"x-api-key": ENV["SUPADATA_API_KEY"]},
            timeout=20,
        )
        if err:
            print(f"  search '{q}' failed: {err}", file=sys.stderr)
            continue
        for r in body.get("results", []):
            if r.get("type") == "video" and r.get("id") and r["id"] not in pool:
                pool[r["id"]] = r.get("title") or r["id"]
        time.sleep(1.0)
    pool_cache.parent.mkdir(parents=True, exist_ok=True)
    pool_cache.write_text(json.dumps(pool), encoding="utf-8")
    return pool


def get_transcript(video_id):
    cache = OUT / "transcripts" / f"{video_id}.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))["text"]
    # Same chain as production lib/transcript.ts: Supadata first,
    # TranscriptAPI fallback. Supadata's plan limit was exhausted mid-eval
    # (2026-10-30) and the fallback carried both prod and this script.
    body, _, err = http_json(
        f"https://api.supadata.ai/v1/youtube/transcript?videoId={video_id}&text=true",
        headers={"x-api-key": ENV["SUPADATA_API_KEY"]},
        timeout=45,
    )
    text = body.get("content") if body else None
    if not isinstance(text, str) or not text.strip():
        body, _, err = http_json(
            "https://transcriptapi.com/api/v2/youtube/transcript?"
            + urllib.parse.urlencode({"video_url": video_id, "format": "text", "include_timestamp": "false"}),
            headers={"Authorization": f"Bearer {ENV['TRANSCRIPTAPI_KEY']}"},
            timeout=45,
        )
        text = body.get("transcript") if body else None
        if err:
            print(f"  transcript fallback {video_id}: {err}", file=sys.stderr)
    if not isinstance(text, str) or not text.strip():
        return None
    text = text.strip()
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps({"text": text}), encoding="utf-8")
    time.sleep(1.0)
    return text


def parse_pack(text):
    s = text.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        s = s.rsplit("```", 1)[0]
    start, end = s.find("{"), s.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(s[start : end + 1])
    except json.JSONDecodeError:
        return None


def cost(model, usage):
    pin, pcached, pout = PRICES[model]
    uncached = max(0, usage["in"] - usage.get("cached", 0))
    return (
        uncached / 1e6 * pin
        + usage.get("cached", 0) / 1e6 * pcached
        + (usage["out"] + usage.get("thought", 0)) / 1e6 * pout
    )


def verify_pack(transcript, pack):
    items = []
    for i, c in enumerate(pack.get("flashcards") or [], 1):
        items.append(f"{i}. [flashcard] Q: {c.get('question')} A: {c.get('answer')}")
    base = len(items)
    for j, q in enumerate(pack.get("quizzes") or [], 1):
        items.append(f"{base + j}. [quiz] Q: {q.get('question')} A: {q.get('correct_answer')} — {q.get('explanation')}")
    text, usage, ms, err = call_gemini(
        VERIFY_TEMPLATE.replace("{transcript}", transcript[:60000]).replace("{items}", "\n".join(items)),
        1024,
    )
    if err:
        return {"flags": -1, "detail": err, "usage": usage, "ms": ms}
    verdict = text.strip()
    if verdict.upper().startswith("NONE"):
        return {"flags": 0, "detail": "", "usage": usage, "ms": ms}
    flagged = [ln for ln in verdict.splitlines() if ln.strip() and ln.strip()[0].isdigit()]
    return {"flags": len(flagged), "detail": verdict[:1500], "usage": usage, "ms": ms}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--skip-chat", action="store_true")
    ap.add_argument("--skip-verify", action="store_true")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    env_path = ROOT / ".env"
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            ENV[k.strip()] = v.strip()
    for key in ("GEMINI_API_KEY", "ANTHROPIC_API_KEY", "SUPADATA_API_KEY"):
        if not ENV.get(key):
            sys.exit(f"missing {key} in .env")
    OUT.mkdir(parents=True, exist_ok=True)

    print("building video pool from Supadata search...")
    pool = search_videos()
    ids = sorted(pool)
    random.Random(args.seed).shuffle(ids)
    print(f"pool: {len(ids)} unique videos")

    videos = []
    for vid in ids:
        if len(videos) >= args.limit:
            break
        text = get_transcript(vid)
        if not text:
            print(f"  skip {vid} (no transcript)")
            continue
        words = count_words(text)
        videos.append({"id": vid, "title": pool[vid], "words": words, "band": band_for(words), "transcript": text})
        print(f"  kept {vid} ({words} words, band {videos[-1]['band']}) — {pool[vid][:50]}")
    if not videos:
        sys.exit("no videos with transcripts")

    results = {"videos": [], "totals": {}}
    totals = {m: {"gen": {"n": 0, "in": 0, "out": 0, "cost": 0.0, "ms": []},
                  "chat": {"n": 0, "in": 0, "out": 0, "cost": 0.0, "ms": []},
                  "verify_cost": 0.0} for m in ("gemini", "haiku")}

    for v in videos:
        cards, questions = BANDS[v["band"]]
        prompt = (
            STUDY_PACK_TEMPLATE.replace("{CARDS}", f"{cards} flashcards")
            .replace("{QUESTIONS}", f"{questions} multiple-choice questions")
            + f"\n\nCONTENT (video transcript):\n{v['transcript'][:120000]}\n\n{JSON_FORMAT_CONTRACT}"
        )
        row = {"id": v["id"], "title": v["title"][:60], "words": v["words"], "band": v["band"], "models": {}}
        for model, call in (("gemini", call_gemini), ("haiku", call_haiku)):
            # Gemini mirrors generateCore (65536). Haiku gets comparable
            # room — at the F2 route's 4000 it truncates mid-JSON on any
            # banded pack (first smoke-run finding).
            max_tokens = 65536 if model == "gemini" else 16384
            text, usage, ms, err = call(prompt, max_tokens)
            time.sleep(1.2)
            pack = parse_pack(text) if text else None
            mrow = {"gen_ms": round(ms), "usage": usage, "error": err, "pack_ok": pack is not None,
                    "cards": len((pack or {}).get("flashcards") or []),
                    "quizzes": len((pack or {}).get("quizzes") or []), "chat": []}
            t = totals[model]["gen"]
            t["n"] += 1
            t["in"] += usage["in"]
            t["out"] += usage["out"] + usage.get("thought", 0)
            t["cost"] += cost(model, usage)
            t["ms"].append(ms)

            if pack and not args.skip_verify:
                verdict = verify_pack(v["transcript"], pack)
                mrow["verify"] = verdict
                totals[model]["verify_cost"] += cost("gemini", verdict["usage"])
                time.sleep(1.2)

            if not args.skip_chat:
                ctx = v["transcript"][:50000]
                for q in CHAT_QUESTIONS:
                    ctext, cusage, cms, cerr = call(
                        CHAT_TEMPLATE.replace("{context}", ctx).replace("{question}", q), 2048
                    )
                    time.sleep(1.0)
                    ct = totals[model]["chat"]
                    ct["n"] += 1
                    ct["in"] += cusage["in"]
                    ct["out"] += cusage["out"]
                    ct["cost"] += cost(model, cusage)
                    ct["ms"].append(cms)
                    mrow["chat"].append({"q": q[:30], "ms": round(cms), "chars": len(ctext), "err": cerr})
            row["models"][model] = mrow
            print(f"  {v['id']} {model}: pack_ok={mrow['pack_ok']} cards={mrow['cards']} quizzes={mrow['quizzes']} flags={mrow.get('verify', {}).get('flags', 'skipped')}")
        results["videos"].append(row)

    summary = {m: {
        "gen_calls": t["gen"]["n"], "gen_tokens_in": t["gen"]["in"], "gen_tokens_out": t["gen"]["out"],
        "gen_cost_usd": round(t["gen"]["cost"], 4), "gen_avg_ms": round(sum(t["gen"]["ms"]) / max(1, len(t["gen"]["ms"]))),
        "chat_calls": t["chat"]["n"], "chat_tokens_in": t["chat"]["in"], "chat_tokens_out": t["chat"]["out"],
        "chat_cost_usd": round(t["chat"]["cost"], 4), "chat_avg_ms": round(sum(t["chat"]["ms"]) / max(1, len(t["chat"]["ms"]))),
        "verify_cost_usd": round(t["verify_cost"], 4),
        "total_cost_usd": round(t["gen"]["cost"] + t["chat"]["cost"] + t["verify_cost"], 4),
    } for m, t in totals.items()}
    results["totals"] = summary
    (OUT / "results.json").write_text(json.dumps(results, indent=1), encoding="utf-8")

    lines = ["# QuizliA model eval — item 12", "",
             f"Videos: {len(videos)} | prompt: study_pack v2 (section 6 bands) | chat: chat-core contract | verifier: {GEMINI_MODEL}", "",
             "| Model | gen calls | gen in/out tokens | gen avg ms | gen $ | chat calls | chat $ | verify $ | total $ |",
             "|---|---|---|---|---|---|---|---|---|"]
    for m, s in summary.items():
        name = GEMINI_MODEL if m == "gemini" else HAIKU_MODEL
        lines.append(f"| {name} | {s['gen_calls']} | {s['gen_tokens_in']}/{s['gen_tokens_out']} | {s['gen_avg_ms']} | ${s['gen_cost_usd']:.4f} | {s['chat_calls']} | ${s['chat_cost_usd']:.4f} | ${s['verify_cost_usd']:.4f} | ${s['total_cost_usd']:.4f} |")
    lines += ["", "## Per video", "",
              "| video | words | band | gemini cards/quizzes (flags) | haiku cards/quizzes (flags) |",
              "|---|---|---|---|---|"]
    for r in results["videos"]:
        g, h = r["models"]["gemini"], r["models"]["haiku"]
        gf = g.get("verify", {}).get("flags", "-")
        hf = h.get("verify", {}).get("flags", "-")
        lines.append(f"| {r['title']} | {r['words']} | {r['band']} | {g['cards']}/{g['quizzes']} ({gf}) | {h['cards']}/{h['quizzes']} ({hf}) |")
    lines += ["", "## Band compliance", ""]
    for r in results["videos"]:
        (cmin, cmax), (qmin, qmax) = BAND_RANGES[r["band"]]
        for m in ("gemini", "haiku"):
            mo = r["models"][m]
            ok = cmin <= mo["cards"] <= cmax and qmin <= mo["quizzes"] <= qmax
            if not ok:
                lines.append(f"- {r['title']} [{m}]: {mo['cards']} cards / {mo['quizzes']} quizzes outside band {r['band']} ({cmin}-{cmax} / {qmin}-{qmax})")
    lines += ["", "## Unsupported-claim flags (verifier output)", ""]
    any_flag = False
    for r in results["videos"]:
        for m in ("gemini", "haiku"):
            v = r["models"][m].get("verify")
            if v and v.get("flags", 0) not in (0, -1):
                any_flag = True
                lines.append(f"### {r['title']} — {m}")
                lines.append("```")
                lines.append(v["detail"][:1200])
                lines.append("```")
    if not any_flag:
        lines.append("- none")
    (OUT / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nwrote {OUT / 'summary.md'}")
    for m, s in summary.items():
        print(f"{m}: total ${s['total_cost_usd']:.4f}")


if __name__ == "__main__":
    main()
