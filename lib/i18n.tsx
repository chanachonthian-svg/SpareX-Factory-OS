"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dict, LOCALES, type Locale } from "./dict";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nValue>({
  locale: "en",
  setLocale: () => {},
  t: (k) => k,
});

const STORAGE_KEY = "factoryos:locale";
const valid = (l: string): l is Locale => LOCALES.some((x) => x.code === l);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start at "en" so SSR and the first client render match (no hydration
  // mismatch). The saved locale is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && valid(saved)) setLocaleState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  }

  const t = (key: string) => dict[locale][key] ?? dict.en[key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
