"use client";

/** Turns Engineering-Rule findings into the outcomes a customer actually sees:
 *  a work order + an in-app alert that CITES the standard (the "why we alerted").
 *  The rule definitions stay SpareX-side; only these outcomes cross to the plant.
 *  Both sinks dedupe on a stable id, so re-dispatching the same finding is a no-op. */

import { createWorkOrder } from "./workorders";
import { pushNotification } from "./notifications";
import { ruleById, type Finding } from "./rules";

/** stable per-finding id so WO + notification dedupe across repeated dispatches */
export const findingUid = (f: Finding) => `rule-${f.ruleId}-${f.scope}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

export function dispatchFindings(findings: Finding[], atStamp: string): { wos: number; alerts: number } {
  let wos = 0, alerts = 0;
  for (const f of findings) {
    const rule = ruleById(f.ruleId);
    if (!rule) continue;
    const uid = findingUid(f);

    createWorkOrder(
      {
        id: uid,
        code: rule.standard,
        title: { en: `${rule.name.en} — ${f.scope}`, th: `${rule.name.th} — ${f.scope}` },
        asset: { en: f.scope, th: f.scope },
        severity: f.severity === "critical" ? "critical" : "warning",
        capex: 0,
        annualSaving: f.bahtAtRisk,
        partsCount: 0,
      },
      "asset",
    );
    wos++;

    pushNotification({
      id: uid,
      source: "maintenance",
      kind: "alert",
      title: { en: `${rule.name.en} · ${f.scope}`, th: `${rule.name.th} · ${f.scope}` },
      // the standard reference IS the transparency the customer's engineers want
      body: {
        en: `${f.value} exceeds ${rule.standard} (limit ${f.limit}) — ฿${f.bahtAtRisk.toLocaleString()} at risk. Work order raised.`,
        th: `${f.value} เกินเกณฑ์ ${rule.standard} (${f.limit}) · เสี่ยง ฿${f.bahtAtRisk.toLocaleString()} · ออกใบสั่งงานแล้ว`,
      },
      at: atStamp,
      read: false,
      href: "/os/workorders",
    });
    alerts++;
  }
  return { wos, alerts };
}
