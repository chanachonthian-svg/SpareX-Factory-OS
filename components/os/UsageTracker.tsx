"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { publicAsset } from "@/lib/paths";

/** Records demo usage for the SpareX admin analytics: one "view" per route + a
 *  "dwell" (ms on that tab) when the visitor leaves it. Tied to the login email.
 *  Uses sendBeacon on unload so the last tab's dwell isn't lost. Renders nothing. */
export function UsageTracker() {
  const pathname = usePathname();
  const sid = useRef<string>("");
  const emailRef = useRef<string>("");
  const enteredAt = useRef<number>(0);
  const curPath = useRef<string>("");

  // stable per-visit session id + the logged-in email
  useEffect(() => {
    try {
      let s = sessionStorage.getItem("factoryos:sid");
      if (!s) {
        s = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
        sessionStorage.setItem("factoryos:sid", s);
      }
      sid.current = s;
      emailRef.current = JSON.parse(localStorage.getItem("factoryos:demo-login") || "{}").email || "";
    } catch { /* ignore */ }
  }, []);

  const post = (type: "view" | "dwell", path: string, ms?: number) => {
    if (!sid.current) return;
    const body = JSON.stringify({ type, sid: sid.current, email: emailRef.current, path, ms });
    try {
      if (type === "dwell" && "sendBeacon" in navigator) {
        navigator.sendBeacon(publicAsset("/api/track"), new Blob([body], { type: "application/json" }));
      } else {
        fetch(publicAsset("/api/track"), { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body }).catch(() => {});
      }
    } catch { /* ignore */ }
  };

  // on each route change: flush the previous tab's dwell, then log the new view
  useEffect(() => {
    if (!pathname) return;
    if (curPath.current && curPath.current !== pathname) {
      post("dwell", curPath.current, Date.now() - enteredAt.current);
    }
    curPath.current = pathname;
    enteredAt.current = Date.now();
    post("view", pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // flush the current tab's dwell when the page is hidden/closed
  useEffect(() => {
    const flush = () => { if (curPath.current) post("dwell", curPath.current, Date.now() - enteredAt.current); enteredAt.current = Date.now(); };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
