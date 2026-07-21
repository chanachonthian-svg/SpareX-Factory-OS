import { NextResponse } from "next/server";
import { scriptedReply, systemPrompt, LANG_NAME, type ScriptedAnswer } from "@/lib/copilot";
import type { Locale } from "@/lib/dict";

export const runtime = "nodejs";

// JA/ZH dropped from the product 2026-07-13 — Copilot now answers in EN/TH only
const LOCALES: Locale[] = ["en", "th"];

function normalizeLocale(input: unknown, message = ""): Locale {
  const text = message.toLowerCase();
  if (/\b(english|อังกฤษ)\b/u.test(text)) return "en";
  if (/\b(thai|ภาษาไทย|ไทย)\b/u.test(text)) return "th";
  if (/[\u0E00-\u0E7F]/u.test(message)) return "th";
  if (/[\u3040-\u30FF]/u.test(message)) return "ja";
  if (/[\u4E00-\u9FFF]/u.test(message)) return "zh";
  if (/[a-z]{3,}/i.test(message)) return "en";

  const raw = String(input || "").toLowerCase();
  if (raw.startsWith("th") || raw.includes("thai")) return "th";
  if (raw.startsWith("ja") || raw.includes("japanese")) return "ja";
  if (raw.startsWith("zh") || raw.includes("chinese")) return "zh";
  if (raw.startsWith("en") || raw.includes("english")) return "en";
  return "en";
}

function languageRule(locale: Locale) {
  return [
    `CRITICAL RESPONSE LANGUAGE RULE: Reply only in ${LANG_NAME[locale]}.`,
    "Use the language detected from the user's latest message. If the user explicitly asks for another language, use that requested language.",
    "Keep product names, machine IDs, KPI labels, units, and currency symbols as-is when needed.",
    "If the user asks for a summary in Thai, the summary must be written in Thai.",
  ].join(" ");
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

function answer(body: string): ScriptedAnswer {
  return { title: "", body, bullets: [] };
}

async function askGemini(message: string, locale: Locale) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${systemPrompt}\n${languageRule(locale)}`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `${languageRule(locale)}\n\nUser request:\n${message}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 700,
          temperature: 0.4,
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  return text ? answer(text) : null;
}

async function askClaude(message: string, locale: Locale) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: key });
  const model = process.env.COPILOT_MODEL || "claude-opus-4-8";
  const res = await client.messages.create({
    model,
    max_tokens: 700,
    system: `${systemPrompt}\n${languageRule(locale)}`,
    messages: [{ role: "user", content: `${languageRule(locale)}\n\nUser request:\n${message}` }],
  });
  const text = res.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  return text ? answer(text) : null;
}

/** AI Factory Copilot endpoint.
 *  - With GEMINI_API_KEY or GOOGLE_AI_API_KEY: answers live via Gemini.
 *  - With ANTHROPIC_API_KEY only: answers live via Claude.
 *  - Without a key: returns a localized scripted, data-grounded answer.
 *  Either way the shape is { title, body, bullets } so the UI is identical. */
export async function POST(req: Request) {
  let message = "";
  let locale: Locale = "en";
  try {
    const json = await req.json();
    message = (json?.message ?? "").toString().slice(0, 2000);
    locale = normalizeLocale(json?.locale ?? json?.language ?? json?.lang, message);
  } catch {
    /* ignore */
  }

  try {
    const gemini = await askGemini(message, locale);
    if (gemini) return NextResponse.json(gemini);
  } catch {
    /* fall through */
  }

  try {
    const claude = await askClaude(message, locale);
    if (claude) return NextResponse.json(claude);
  } catch {
    /* fall through */
  }

  return NextResponse.json(scriptedReply(message, locale) satisfies ScriptedAnswer);
}
