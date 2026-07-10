"use client";

/** Cross-module UI bus — lets a view on one workspace tab focus an asset in the
 *  Digital Twin that lives on another tab. The requester sets `pendingAsset`
 *  (read by the twin on mount) and fires window events (handled if already
 *  mounted): `factoryos:switch-tab` flips ModuleWorkspace to the target tab and
 *  `factoryos:focus-asset` selects the asset. */
export const uibus: { pendingAsset: string | null } = { pendingAsset: null };

/** switch the active ModuleWorkspace tab by its id (same-module cross-tab link) */
export function switchTab(id: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("factoryos:switch-tab", { detail: { id } }));
  }
}

export function focusTwinAsset(id: string, tabId = "live") {
  uibus.pendingAsset = id;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("factoryos:switch-tab", { detail: { id: tabId } }));
    window.dispatchEvent(new CustomEvent("factoryos:focus-asset", { detail: { id } }));
  }
}
