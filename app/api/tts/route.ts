import { NextResponse } from "next/server";
import type { Locale } from "@/lib/dict";

export const runtime = "nodejs";

const LANG_HINT: Record<Locale, string> = {
  en: "English",
  th: "Thai",
  ja: "Japanese",
  zh: "Mandarin Chinese",
};

type TtsResponse = {
  output_audio?: { data?: string };
  outputAudio?: { data?: string };
  steps?: Array<{
    content?: Array<{
      mime_type?: string;
      mimeType?: string;
      data?: string;
    }>;
  }>;
};

function wavFromPcm(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function generateSpeech(text: string, locale: Locale) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("missing Gemini key");

  const models = [
    process.env.GEMINI_TTS_MODEL,
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts",
  ].filter(Boolean) as string[];

  let lastError = "";
  for (const model of models) {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        model,
        input: `Read this ${LANG_HINT[locale]} executive factory briefing naturally and clearly:\n${text}`,
        response_format: { type: "audio" },
        generation_config: {
          speech_config: [{ voice: "Kore" }],
        },
      }),
    });

    if (!response.ok) {
      lastError = `${model}: ${response.status}`;
      continue;
    }
    const data = (await response.json()) as TtsResponse;
    const audio =
      data.output_audio?.data ||
      data.outputAudio?.data ||
      data.steps
        ?.flatMap((step) => step.content || [])
        .find((part) => (part.mime_type || part.mimeType || "").startsWith("audio/"))?.data;
    if (audio) return wavFromPcm(Buffer.from(audio, "base64"));
    lastError = `${model}: no audio`;
  }
  throw new Error(lastError || "tts failed");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const locale = (["en", "th", "ja", "zh"].includes(body?.locale) ? body.locale : "th") as Locale;
    const text = String(body?.text || "").slice(0, 4000);
    if (!text.trim()) return NextResponse.json({ error: "missing text" }, { status: 400 });
    const wav = await generateSpeech(text, locale);
    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "tts failed" }, { status: 503 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawLocale = url.searchParams.get("locale");
    const locale = (rawLocale && ["en", "th", "ja", "zh"].includes(rawLocale) ? rawLocale : "th") as Locale;
    const text = String(url.searchParams.get("text") || "").slice(0, 4000);
    if (!text.trim()) return NextResponse.json({ error: "missing text" }, { status: 400 });
    const wav = await generateSpeech(text, locale);
    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "tts failed" }, { status: 503 });
  }
}
