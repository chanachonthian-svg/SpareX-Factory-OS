"use client";

import { useI18n } from "@/lib/i18n";

/** Inline translated text — usable inside server components for static labels. */
export function Tr({ k }: { k: string }) {
  const { t } = useI18n();
  return <>{t(k)}</>;
}
