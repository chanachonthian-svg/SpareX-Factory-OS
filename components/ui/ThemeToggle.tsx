"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "factoryos:theme";

/** Dark / light mode toggle. Dark is the default; choice persists. */
export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    // the inline script in layout applies the class pre-paint; sync state here
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    setLight((l) => {
      const next = !l;
      document.documentElement.classList.toggle("light", next);
      try {
        localStorage.setItem(KEY, next ? "light" : "dark");
      } catch {}
      return next;
    });
  }

  return (
    <button
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:text-white"
    >
      {light ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
