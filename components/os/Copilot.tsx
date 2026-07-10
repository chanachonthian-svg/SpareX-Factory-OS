"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { COPILOT_EVENT, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { publicAsset } from "@/lib/paths";
import {
  suggestedPrompts,
  scriptedReply,
  type ScriptedAnswer,
} from "@/lib/copilot";

/** Visible label is localized; the canonical English prompt is what gets sent. */
const PROMPTS = suggestedPrompts.map((en, i) => ({ en, k: `cp.q${i}` }));

type Msg = { id: number; role: "user" | "assistant" } & Partial<ScriptedAnswer> & {
  body: string;
};

/** Copilot mascot avatar — the SpareX bot image, with a graceful fallback to the sparkle mark. */
function BotAvatar({ size }: { size: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <Sparkles size={size} />;
  return (
    <img
      src={publicAsset("/sparex-bot.png?v=1")}
      alt="SpareX Copilot"
      className="h-full w-full object-cover"
      onError={() => setOk(false)}
    />
  );
}

export function Copilot() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const idRef = useRef(0);
  // keep the current locale readable from the stable event-listener closure
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Open via global event (sidebar / topbar / inline buttons), optionally with a prompt.
  useEffect(() => {
    function onOpen(e: Event) {
      setOpen(true);
      const prompt = (e as CustomEvent).detail?.prompt as string | undefined;
      if (prompt) setTimeout(() => send(prompt), 120);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener(COPILOT_EVENT, onOpen as EventListener);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(COPILOT_EVENT, onOpen as EventListener);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const userMsg: Msg = { id: idRef.current++, role: "user", body: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch(publicAsset("/api/copilot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, locale: localeRef.current }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as ScriptedAnswer;
      setMessages((m) => [
        ...m,
        { id: idRef.current++, role: "assistant", ...data, body: data.body },
      ]);
    } catch {
      const fallback = scriptedReply(q, localeRef.current);
      setMessages((m) => [
        ...m,
        { id: idRef.current++, role: "assistant", ...fallback, body: fallback.body },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* floating launcher — gentle up/down float + a pulsing "sonar" halo so it feels alive */}
      <motion.div
        className="fixed bottom-5 right-5 z-40"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-brand-400/50"
          animate={{ scale: [1, 1.7], opacity: [0.45, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.button
          onClick={() => setOpen(true)}
          className="group relative grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950 shadow-glow"
          aria-label="Open AI Copilot"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
        >
          <BotAvatar size={22} />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900/95 backdrop-blur-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              {/* header */}
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950">
                  <BotAvatar size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">AI Factory Copilot™</p>
                  <p className="text-[11px] text-white/45">{t("cp.sub")}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-white/45 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* messages */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/75">
                      {t("cp.intro")}
                    </div>
                    <p className="px-1 text-[11px] uppercase tracking-wider text-white/40">
                      {t("cp.try")}
                    </p>
                    <div className="flex flex-col gap-2">
                      {PROMPTS.map((p) => (
                        <button
                          key={p.k}
                          onClick={() => send(p.en)}
                          className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-sm text-white/70 transition hover:border-brand-400/30 hover:bg-brand-400/5 hover:text-white"
                        >
                          {t(p.k)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-400/15 px-4 py-2.5 text-sm text-white">
                        {m.body}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-2.5">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950">
                        <BotAvatar size={14} />
                      </span>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/80">
                        {m.title ? (
                          <p className="mb-1.5 font-semibold text-white">{m.title}</p>
                        ) : null}
                        <p>{m.body}</p>
                        {m.bullets?.length ? (
                          <ul className="mt-2.5 space-y-1.5">
                            {m.bullets.map((b, i) => (
                              <li key={i} className="flex gap-2 text-white/70">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  ),
                )}

                {busy && (
                  <div className="flex items-center gap-2 px-1 text-sm text-white/45">
                    <Loader2 size={14} className="animate-spin" /> {t("cp.analyzing")}
                  </div>
                )}
              </div>

              {/* input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-brand-400/40">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder={t("cp.placeholder")}
                    className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim() || busy}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-xl transition",
                      input.trim() && !busy
                        ? "bg-gradient-to-br from-brand-400 to-accent-500 text-ink-950"
                        : "bg-white/5 text-white/30",
                    )}
                  >
                    <ArrowUp size={16} />
                  </button>
                </div>
                <p className="mt-2 px-1 text-[10px] text-white/30">
                  {t("cp.disclaimer")}
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
