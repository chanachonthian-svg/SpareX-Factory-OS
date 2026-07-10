"use client";

import type { ReactNode } from "react";
import { openCopilot } from "@/lib/utils";

/** A button that opens the AI Copilot pre-loaded with a prompt. */
export function AskCopilot({
  prompt,
  children,
  className,
}: {
  prompt: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button onClick={() => openCopilot(prompt)} className={className}>
      {children}
    </button>
  );
}
