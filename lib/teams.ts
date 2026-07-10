"use client";

import { useSyncExternalStore } from "react";
import { assets } from "./factory";

/**
 * Maintenance org — the single source of truth for "who owns which machine".
 * A supervisor defines Teams (each with a Leader + Crew) and maps every plant
 * section (production line / utility system) to a team. Work Orders and the
 * Digital Twin both resolve the responsible team + leader from here. Editable
 * and persisted, so the whole plant agrees.
 */

export type LZ = { en: string; th: string };

export type Person = { id: string; name: LZ; trade: LZ; phone: string; email: string; lines: string[] };

/** the seed engineer roster — a realistic factory Maintenance & Engineering
 *  department (แผนกซ่อมบำรุง): a supervisor per section plus the hands-on trades
 *  a real plant staffs. `lines` = the plant sections each engineer personally
 *  covers (supervisors oversee; technicians own the sections). Work Orders & the
 *  twin resolve the responsible person (and their team) from this. */
const SEED_PEOPLE: Person[] = [
  // ── แผนกไฟฟ้า & เครื่องมือวัด (Electrical & Instrumentation) ──
  { id: "thana", name: { en: "Thana", th: "ธนา" }, trade: { en: "E&I Supervisor", th: "หัวหน้าแผนกไฟฟ้า & เครื่องมือวัด" }, phone: "086-512-4401", email: "thana@sparexth.com", lines: [] },
  { id: "somchai", name: { en: "Somchai", th: "สมชาย" }, trade: { en: "Power Electrician", th: "ช่างไฟฟ้ากำลัง" }, phone: "081-345-6621", email: "somchai@sparexth.com", lines: ["Electrical"] },
  { id: "arun", name: { en: "Arun", th: "อรุณ" }, trade: { en: "Controls Electrician", th: "ช่างไฟฟ้าควบคุม" }, phone: "081-345-6622", email: "arun@sparexth.com", lines: [] },
  { id: "kanya", name: { en: "Kanya", th: "กัญญา" }, trade: { en: "Instrument & PLC Technician", th: "ช่างเครื่องมือวัด & PLC" }, phone: "092-118-4030", email: "kanya@sparexth.com", lines: [] },
  // ── แผนกเครื่องกลการผลิต (Production Mechanical) ──
  { id: "prayut", name: { en: "Prayut", th: "ประยุทธ์" }, trade: { en: "Mechanical Supervisor", th: "หัวหน้าแผนกเครื่องกล" }, phone: "086-512-4402", email: "prayut@sparexth.com", lines: [] },
  { id: "preecha", name: { en: "Preecha", th: "ปรีชา" }, trade: { en: "Mechanical Technician", th: "ช่างซ่อมบำรุงเครื่องกล" }, phone: "084-556-2011", email: "preecha@sparexth.com", lines: ["Line A", "Logistics"] },
  { id: "malee", name: { en: "Malee", th: "มาลี" }, trade: { en: "Mechanical Technician", th: "ช่างซ่อมบำรุงเครื่องกล" }, phone: "084-556-2012", email: "malee@sparexth.com", lines: ["Line B", "Line C"] },
  { id: "somkiat", name: { en: "Somkiat", th: "สมเกียรติ" }, trade: { en: "Welder / Fabrication", th: "ช่างเชื่อม & งานโครงสร้าง" }, phone: "084-556-2013", email: "somkiat@sparexth.com", lines: [] },
  // ── แผนกทำความเย็น & ปรับอากาศ (Refrigeration & HVAC) ──
  { id: "anan", name: { en: "Anan", th: "อนันต์" }, trade: { en: "Refrigeration Supervisor", th: "หัวหน้าแผนกทำความเย็น" }, phone: "088-703-1150", email: "anan@sparexth.com", lines: [] },
  { id: "nid", name: { en: "Nid", th: "นิด" }, trade: { en: "Refrigeration Technician", th: "ช่างระบบทำความเย็น (Chiller)" }, phone: "087-664-2201", email: "nid@sparexth.com", lines: ["Cooling"] },
  { id: "manop", name: { en: "Manop", th: "มานพ" }, trade: { en: "HVAC Technician", th: "ช่างปรับอากาศ (HVAC)" }, phone: "087-664-2202", email: "manop@sparexth.com", lines: ["HVAC"] },
  // ── แผนกสาธารณูปโภค (Utilities) ──
  { id: "wichai", name: { en: "Wichai", th: "วิชัย" }, trade: { en: "Utilities Supervisor", th: "หัวหน้าแผนกสาธารณูปโภค" }, phone: "089-221-7788", email: "wichai@sparexth.com", lines: [] },
  { id: "chai", name: { en: "Chai", th: "ชัย" }, trade: { en: "Boiler Operator", th: "ช่างหม้อไอน้ำ" }, phone: "090-337-8890", email: "chai@sparexth.com", lines: ["Steam"] },
  { id: "narong", name: { en: "Narong", th: "ณรงค์" }, trade: { en: "Air Compressor Technician", th: "ช่างระบบอัดอากาศ" }, phone: "090-337-8891", email: "narong@sparexth.com", lines: ["Compressed Air"] },
  { id: "suda", name: { en: "Suda", th: "สุดา" }, trade: { en: "Water Treatment Operator", th: "ช่างระบบบำบัดน้ำ" }, phone: "090-337-8892", email: "suda@sparexth.com", lines: ["Environmental"] },
];
/* --- people (roster) store — supervisor can add/remove engineers --- */
const PKEY = "factoryos:people";
let pcache: Person[] | null = null;
const psubs = new Set<() => void>();

function loadPeople(): Person[] {
  if (pcache) return pcache;
  if (typeof window === "undefined") return SEED_PEOPLE;
  try {
    const raw = localStorage.getItem(PKEY);
    // migrate rosters saved before phone/email/lines existed
    pcache = raw
      ? (JSON.parse(raw) as Person[]).map((p) => ({ ...p, phone: p.phone ?? "", email: p.email ?? "", lines: Array.isArray(p.lines) ? p.lines : [] }))
      : SEED_PEOPLE.map((p) => ({ ...p, lines: [...p.lines] }));
  } catch {
    pcache = SEED_PEOPLE;
  }
  return pcache;
}
function savePeople(next: Person[]) {
  pcache = next;
  try { localStorage.setItem(PKEY, JSON.stringify(next)); } catch {}
  psubs.forEach((f) => f());
}
function subPeople(fn: () => void) {
  psubs.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === PKEY) { pcache = null; fn(); } };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => { psubs.delete(fn); if (typeof window !== "undefined") window.removeEventListener("storage", onStorage); };
}

export function usePeople(): Person[] {
  return useSyncExternalStore(subPeople, loadPeople, () => SEED_PEOPLE);
}
export const allPeople = (): Person[] => loadPeople();
export const personById = (id: string): Person | undefined => loadPeople().find((p) => p.id === id);

export function addPerson(name: string, trade: string, phone = "", email = ""): string {
  const people = loadPeople();
  const id = `p-${people.length + 1}-${people.reduce((n, p) => n + p.id.length, 0)}`;
  savePeople([...people, { id, name: { en: name, th: name }, trade: { en: trade, th: trade }, phone, email, lines: [] }]);
  return id;
}
/** assign a plant section to one engineer (removing it from whoever covered it before) */
export function assignLineToPerson(line: string, personId: string | null) {
  savePeople(loadPeople().map((p) => ({
    ...p,
    lines: p.id === personId ? Array.from(new Set([...p.lines, line])) : p.lines.filter((l) => l !== line),
  })));
}
/** restore every engineer's section coverage to the seed defaults (keeps the roster + contacts) */
export function resetCoverage() {
  savePeople(loadPeople().map((p) => {
    const seed = SEED_PEOPLE.find((s) => s.id === p.id);
    return { ...p, lines: seed ? [...seed.lines] : [] };
  }));
}
/** edit an engineer's details (name/trade are stored for both locales) */
export function updatePerson(id: string, patch: { name?: string; trade?: string; phone?: string; email?: string }) {
  savePeople(loadPeople().map((p) => (p.id === id ? {
    ...p,
    ...(patch.name !== undefined ? { name: { en: patch.name, th: patch.name } } : {}),
    ...(patch.trade !== undefined ? { trade: { en: patch.trade, th: patch.trade } } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
  } : p)));
}
/** remove an engineer from the roster — also pull them off every team (a led team gets a new leader) */
export function removePerson(id: string) {
  const people = loadPeople();
  if (people.length <= 1) return;
  const rest = people.filter((p) => p.id !== id);
  savePeople(rest);
  save(load().map((t) => {
    const memberIds = t.memberIds.filter((m) => m !== id);
    let leaderId = t.leaderId;
    if (leaderId === id) leaderId = memberIds[0] ?? rest[0]?.id ?? id;
    return { ...t, leaderId, memberIds: memberIds.filter((m) => m !== leaderId) };
  }));
}

export type Team = {
  id: string;
  name: LZ;
  color: string;
  leaderId: string;
  memberIds: string[];
  // plant-section coverage lives per-person now (Person.lines); a team's coverage
  // is the union of its members' — see teamLines().
};

const SEED_TEAMS: Team[] = [
  { id: "elec", name: { en: "Electrical & Instrumentation", th: "แผนกไฟฟ้า & เครื่องมือวัด" }, color: "#22d3ee", leaderId: "thana", memberIds: ["somchai", "arun", "kanya"] },
  { id: "mech", name: { en: "Production Mechanical", th: "แผนกเครื่องกลการผลิต" }, color: "#f59e0b", leaderId: "prayut", memberIds: ["preecha", "malee", "somkiat"] },
  { id: "cool", name: { en: "Refrigeration & HVAC", th: "แผนกทำความเย็น & ปรับอากาศ" }, color: "#34d399", leaderId: "anan", memberIds: ["nid", "manop"] },
  { id: "util", name: { en: "Utilities", th: "แผนกสาธารณูปโภค" }, color: "#a78bfa", leaderId: "wichai", memberIds: ["chai", "narong", "suda"] },
];

/** every plant section that exists in the model, in a stable order */
export const PLANT_LINES: string[] = (() => {
  const seen: string[] = [];
  for (const a of assets) if (!seen.includes(a.line)) seen.push(a.line);
  return seen;
})();

/* ------------------------------------------------------------------- store */

const KEY = "factoryos:teams";
let cache: Team[] | null = null;
const subs = new Set<() => void>();

function load(): Team[] {
  if (cache) return cache;
  if (typeof window === "undefined") return SEED_TEAMS;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Team[]) : SEED_TEAMS.map((t) => ({ ...t, memberIds: [...t.memberIds] }));
  } catch {
    cache = SEED_TEAMS;
  }
  return cache;
}

function save(next: Team[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  subs.forEach((f) => f());
}

function subscribe(fn: () => void) {
  subs.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; fn(); } };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => { subs.delete(fn); if (typeof window !== "undefined") window.removeEventListener("storage", onStorage); };
}

export function useTeams(): Team[] {
  return useSyncExternalStore(subscribe, load, () => SEED_TEAMS);
}

const mutate = (fn: (t: Team) => Team) => save(load().map(fn));

export function setLeader(teamId: string, personId: string) {
  mutate((t) => (t.id === teamId ? { ...t, leaderId: personId, memberIds: t.memberIds.filter((m) => m !== personId) } : t));
}
export function addMember(teamId: string, personId: string) {
  mutate((t) => (t.id === teamId && t.leaderId !== personId && !t.memberIds.includes(personId) ? { ...t, memberIds: [...t.memberIds, personId] } : t));
}
export function removeMember(teamId: string, personId: string) {
  mutate((t) => (t.id === teamId ? { ...t, memberIds: t.memberIds.filter((m) => m !== personId) } : t));
}
export function resetTeams() {
  save(SEED_TEAMS.map((t) => ({ ...t, memberIds: [...t.memberIds] })));
}
/** full factory-reset of the maintenance org — team structure + roster + coverage */
export function resetAll() {
  savePeople(SEED_PEOPLE.map((p) => ({ ...p, lines: [...p.lines] })));
  resetTeams();
}

const TEAM_PALETTE = ["#22d3ee", "#f59e0b", "#34d399", "#a78bfa", "#f472b6", "#60a5fa", "#fb7185", "#facc15", "#2dd4bf", "#c084fc"];

/** supervisor adds a new team — auto-picks a free colour + a not-yet-leading person */
export function addTeam(name: string): string {
  const teams = load();
  const id = `team-${teams.length + 1}-${teams.reduce((n, t) => n + t.id.length, 0)}`;
  const usedColors = new Set(teams.map((t) => t.color));
  const color = TEAM_PALETTE.find((c) => !usedColors.has(c)) ?? TEAM_PALETTE[teams.length % TEAM_PALETTE.length];
  const people = loadPeople();
  const leading = new Set(teams.map((t) => t.leaderId));
  const leader = people.find((p) => !leading.has(p.id)) ?? people[0];
  save([...teams, { id, name: { en: name, th: name }, color, leaderId: leader.id, memberIds: [] }]);
  return id;
}
/** remove a team (its members stay in the roster; their section coverage is unchanged) */
export function removeTeam(id: string) {
  save(load().filter((t) => t.id !== id));
}
export function renameTeam(id: string, name: string) {
  mutate((t) => (t.id === id ? { ...t, name: { en: name, th: name } } : t));
}

/* -------------------------------------------------------------- resolution */

/** the engineer who personally covers a plant section */
export const personForLine = (line: string, people: Person[]): Person | undefined => people.find((p) => p.lines.includes(line));
export const personForAsset = (assetLine: string, people: Person[]): Person | undefined => personForLine(assetLine, people);
/** the team an engineer belongs to (leader or crew) */
export const teamOfPerson = (personId: string, teams: Team[]): Team | undefined => teams.find((t) => t.leaderId === personId || t.memberIds.includes(personId));
/** the team responsible for a section — derived from the covering engineer */
export const teamForLine = (line: string, teams: Team[], people: Person[]): Team | undefined => {
  const p = personForLine(line, people);
  return p ? teamOfPerson(p.id, teams) : undefined;
};
export const teamForAsset = (assetLine: string, teams: Team[], people: Person[]): Team | undefined => teamForLine(assetLine, teams, people);
export const teamById = (id: string, teams: Team[]): Team | undefined => teams.find((t) => t.id === id);
/** a team's total section coverage = the union of its members' personal coverage */
export const teamLines = (t: Team, people: Person[]): string[] => {
  const ids = new Set([t.leaderId, ...t.memberIds]);
  const out: string[] = [];
  for (const p of people) if (ids.has(p.id)) for (const l of p.lines) if (!out.includes(l)) out.push(l);
  return out;
};
/** everyone on a team (leader first) */
export const teamRoster = (t: Team): Person[] => [t.leaderId, ...t.memberIds].map(personById).filter((p): p is Person => Boolean(p));
