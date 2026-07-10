"use client";

import { Crown, UserPlus, X, Users, RotateCcw, Trash2, Plus, Check, Phone, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import {
  usePeople, addPerson, removePerson, updatePerson, PLANT_LINES, personById, useTeams,
  setLeader, addMember, removeMember, assignLineToPerson, resetAll, teamLines,
  addTeam, removeTeam, renameTeam,
  type Team, type Person, type LZ,
} from "@/lib/teams";

const TEAM_TONE = (c: string) => c; // team colour is the person accent

function initial(p: Person, locale: string) {
  const n = locale === "th" ? p.name.th : p.name.en;
  return [...n][0] ?? "?";
}

function Avatar({ p, color, size = 26, locale }: { p: Person; color: string; size?: number; locale: string }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold text-ink-950" style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}>
      {initial(p, locale)}
    </span>
  );
}

/** Supervisor-facing: define each team's Leader + Crew, and which plant
 *  sections they own. Single source of truth for maintenance ownership. */
export function MaintenanceTeams() {
  const { locale } = useI18n();
  const L = (o: LZ) => (locale === "th" ? o.th : o.en);
  const teams = useTeams();
  const people = usePeople();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const active = teams.find((t) => t.id === activeTeamId) ?? teams[0]; // falls back if the active team was deleted

  // crew nodes (+ an add-crew node) for a team's org branch
  const crewNodes = (t: Team): ReactNode[] => {
    const crew = t.memberIds.map(personById).filter((p): p is Person => Boolean(p)).map((p) => <CrewNode key={p.id} person={p} team={t} locale={locale} L={L} />);
    const available = people.filter((p) => p.id !== t.leaderId && !t.memberIds.includes(p.id));
    return available.length ? [...crew, <AddCrewNode key="__add" team={t} available={available} L={L} />] : crew;
  };

  return (
    <div className="space-y-5">
      {/* ── org chart with per-team tabs: pick a team, see its leader → crew ── */}
      <div className="panel p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Users size={16} /></span>
            <div>
              <h3 className="text-sm font-semibold">{L({ en: "Org chart — maintenance departments", th: "ผังองค์กร — แผนกซ่อมบำรุง" })}</h3>
              <p className="text-[11px] text-white/45">{L({ en: "Pick a department tab to see its supervisor & technicians · click a name to rename, ▾ to change the head, × to remove", th: "เลือกแท็บแผนกเพื่อดูหัวหน้าและช่างในแผนก · คลิกชื่อเพื่อแก้ · ▾ เปลี่ยนหัวหน้า · × เอาออก" })}</p>
            </div>
          </div>
          <button onClick={resetAll} title={L({ en: "Reset the whole maintenance org to defaults", th: "รีเซ็ตทั้งระบบซ่อมบำรุงเป็นค่าเริ่มต้น" })} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/50 transition hover:text-white/80">
            <RotateCcw size={12} /> {L({ en: "Reset", th: "รีเซ็ต" })}
          </button>
        </div>

        {/* team tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-white/8 pb-3">
          {teams.map((t) => {
            const on = active?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTeamId(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${on ? "text-white" : "border-white/10 text-white/55 hover:text-white/85"}`}
                style={on ? { borderColor: `${t.color}88`, backgroundColor: `${t.color}1f` } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {L(t.name)}
                <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-white/55">{1 + t.memberIds.length}</span>
              </button>
            );
          })}
          <button onClick={() => { const id = addTeam(L({ en: "New department", th: "แผนกใหม่" })); setActiveTeamId(id); }} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-brand-400/30 px-2.5 py-1.5 text-[12px] font-medium text-brand-200 transition hover:bg-brand-400/10"><Plus size={13} /> {L({ en: "Add dept", th: "เพิ่มแผนก" })}</button>
        </div>

        {/* selected team's org branch */}
        {active ? (
          <div key={active.id} className="overflow-x-auto">
            <div className="mx-auto flex min-w-max flex-col items-center px-2 pb-1">
              <LeaderNode team={active} locale={locale} L={L} />
              <OrgChildren nodes={crewNodes(active)} color={active.color} />
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-white/40">{L({ en: "No teams yet — add one above.", th: "ยังไม่มีทีม — กดเพิ่มทีมด้านบน" })}</p>
        )}
      </div>

      {/* ── roster: add / remove engineers available to every team ── */}
      <RosterPanel locale={locale} L={L} />
    </div>
  );
}

const ROSTER_COLORS = ["#22d3ee", "#f59e0b", "#34d399", "#a78bfa", "#f472b6", "#60a5fa", "#fb7185", "#facc15", "#2dd4bf", "#c084fc"];
const hashColor = (id: string) => ROSTER_COLORS[[...id].reduce((h, c) => h + c.charCodeAt(0), 0) % ROSTER_COLORS.length];

function RosterPanel({ locale, L }: { locale: string; L: (o: LZ) => string }) {
  const people = usePeople();
  const teams = useTeams();
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const membership = (id: string) => {
    for (const t of teams) {
      if (t.leaderId === id) return { team: t, role: "leader" as const };
      if (t.memberIds.includes(id)) return { team: t, role: "member" as const };
    }
    return null;
  };
  const add = () => {
    if (!name.trim()) return;
    addPerson(name.trim(), trade.trim() || L({ en: "Technician", th: "ช่างเทคนิค" }), phone.trim(), email.trim());
    setName(""); setTrade(""); setPhone(""); setEmail("");
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-brand-400/30 bg-brand-400/10 text-brand-300"><Users size={16} /></span>
        <div>
          <h3 className="text-sm font-semibold">{L({ en: "Engineer roster", th: "ช่างในระบบ" })} · {people.length}</h3>
          <p className="text-[11px] text-white/45">{L({ en: "Everyone you can put in a department. Add new hires or contractors here.", th: "รายชื่อช่างทั้งหมดที่จัดเข้าแผนกได้ — เพิ่มพนักงานใหม่/ผู้รับเหมาได้ที่นี่" })}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full min-w-[780px] table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "21%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "19%" }} />
            <col />
            <col style={{ width: "56px" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-white/8 text-[10px] uppercase tracking-wide text-white/40">
              <th className="px-3 py-2 font-medium">{L({ en: "Engineer", th: "ช่าง" })}</th>
              <th className="px-2 py-2 font-medium">{L({ en: "Department", th: "แผนก" })}</th>
              <th className="px-2 py-2 font-medium">{L({ en: "Phone", th: "เบอร์โทร" })}</th>
              <th className="px-2 py-2 font-medium">{L({ en: "Email", th: "อีเมล" })}</th>
              <th className="px-2 py-2 font-medium">{L({ en: "Sections covered", th: "พื้นที่ดูแล" })}</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const m = membership(p.id);
              const color = m ? m.team.color : hashColor(p.id);
              const confirming = confirmId === p.id;
              const avail = PLANT_LINES.filter((l) => !p.lines.includes(l)); // sections not yet on this person
              return (
                <tr key={p.id} className="border-b border-white/5 align-middle last:border-0 hover:bg-white/[0.02]">
                  {/* engineer + trade */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar p={p} color={color} size={26} locale={locale} />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-[12.5px] font-medium text-white/90">{L(p.name)}</p>
                        <p className="truncate text-[10px] text-white/45">{L(p.trade)}</p>
                      </div>
                    </div>
                  </td>
                  {/* department */}
                  <td className="px-2 py-2">
                    {m ? (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-medium" style={{ color: m.team.color, backgroundColor: `${m.team.color}18` }}>
                        {m.role === "leader" ? <Crown size={9} className="shrink-0" /> : null}<span className="truncate">{L(m.team.name)}</span>
                      </span>
                    ) : <span className="text-[10px] text-white/30">{L({ en: "no dept", th: "ยังไม่มีแผนก" })}</span>}
                  </td>
                  {/* phone (inline-editable) */}
                  <td className="px-1 py-2">
                    <input value={p.phone} onChange={(e) => updatePerson(p.id, { phone: e.target.value })} autoComplete="off" inputMode="tel" placeholder="—" className="w-full rounded bg-transparent px-1.5 py-1 text-[11px] text-white/75 placeholder:text-white/25 transition hover:bg-white/[0.05] focus:bg-white/[0.07] focus:outline-none" />
                  </td>
                  {/* email (inline-editable) */}
                  <td className="px-1 py-2">
                    <input value={p.email} onChange={(e) => updatePerson(p.id, { email: e.target.value })} autoComplete="off" inputMode="email" placeholder="—" className="w-full rounded bg-transparent px-1.5 py-1 text-[11px] text-white/75 placeholder:text-white/25 transition hover:bg-white/[0.05] focus:bg-white/[0.07] focus:outline-none" />
                  </td>
                  {/* sections covered */}
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {p.lines.length ? p.lines.map((l) => (
                        <span key={l} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ color, backgroundColor: `${color}1e` }}>
                          {l}
                          <button onClick={() => assignLineToPerson(l, null)} title={L({ en: "Remove section", th: "เอาพื้นที่ออก" })} className="opacity-60 transition hover:text-rose-300 hover:opacity-100"><X size={9} /></button>
                        </span>
                      )) : <span className="text-[10px] text-white/30">—</span>}
                      {avail.length ? (
                        <select value="" onChange={(e) => { if (e.target.value) assignLineToPerson(e.target.value, p.id); }} title={L({ en: "Assign a section", th: "มอบพื้นที่ให้ช่างคนนี้" })} className="cursor-pointer rounded-md border border-dashed border-white/15 bg-transparent px-1 py-0.5 text-[10px] text-white/45 transition hover:text-white/70 focus:outline-none">
                          <option value="">+ {L({ en: "section", th: "พื้นที่" })}</option>
                          {avail.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      ) : null}
                    </div>
                  </td>
                  {/* action */}
                  <td className="px-1 py-2 text-right">
                    {confirming ? (
                      <span className="inline-flex items-center gap-0.5">
                        <button onClick={() => { removePerson(p.id); setConfirmId(null); }} title={L({ en: "Confirm remove", th: "ยืนยันเอาออก" })} className="grid h-6 w-6 place-items-center rounded-md bg-rose-500/15 text-rose-300 transition hover:bg-rose-500/25"><Check size={13} /></button>
                        <button onClick={() => setConfirmId(null)} title={L({ en: "Cancel", th: "·เลิก" })} className="grid h-6 w-6 place-items-center rounded-md text-white/40 hover:text-white/70"><X size={13} /></button>
                      </span>
                    ) : people.length > 1 ? (
                      <button onClick={() => setConfirmId(p.id)} title={L({ en: "Remove from roster", th: "เอาออกจากระบบ" })} className="grid h-6 w-6 place-items-center rounded-md text-white/30 transition hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={12} /></button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* add new engineer */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
        <UserPlus size={14} className="text-brand-300" />
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} autoComplete="off" placeholder={L({ en: "Name", th: "ชื่อ" })} className="w-28 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/85 placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
        <input value={trade} onChange={(e) => setTrade(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} autoComplete="off" placeholder={L({ en: "Trade (e.g. Electrical)", th: "ความชำนาญ (เช่น ไฟฟ้า)" })} className="w-40 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/85 placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} autoComplete="off" inputMode="tel" placeholder={L({ en: "Phone", th: "เบอร์โทร" })} className="w-32 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/85 placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} autoComplete="off" inputMode="email" placeholder={L({ en: "Email", th: "อีเมล" })} className="w-44 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/85 placeholder:text-white/30 focus:border-brand-400/50 focus:outline-none" />
        <button onClick={add} disabled={!name.trim()} className="inline-flex items-center gap-1 rounded-lg border border-brand-400/30 bg-brand-400/10 px-3 py-1.5 text-[12px] font-medium text-brand-200 transition enabled:hover:bg-brand-400/20 disabled:opacity-40"><Plus size={13} /> {L({ en: "Add engineer", th: "เพิ่มช่าง" })}</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------- org-chart nodes + connectors */

/** connector band + children row under a parent node (org-chart tree lines) */
function OrgChildren({ nodes, color }: { nodes: ReactNode[]; color: string }) {
  const list = nodes.filter(Boolean);
  if (!list.length) return null;
  return (
    <>
      <div className="w-px" style={{ height: 18, backgroundColor: color }} />
      <div className="flex items-start">
        {list.map((n, i) => (
          <div key={i} className="flex flex-col items-center px-2.5">
            <div className="relative w-full" style={{ height: 18 }}>
              {list.length > 1 ? (
                <div className="absolute top-0 h-px" style={{ backgroundColor: color, left: i === 0 ? "50%" : 0, right: i === list.length - 1 ? "50%" : 0 }} />
              ) : null}
              <div className="absolute left-1/2 top-0 w-px -translate-x-1/2" style={{ height: 18, backgroundColor: color }} />
            </div>
            {n}
          </div>
        ))}
      </div>
    </>
  );
}

function LeaderNode({ team, locale, L }: { team: Team; locale: string; L: (o: LZ) => string }) {
  const people = usePeople();
  const leader = personById(team.leaderId);
  const coverage = teamLines(team, people); // team's total section coverage = union of members' personal coverage
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="w-[190px] rounded-xl border p-2.5" style={{ borderColor: `${team.color}66`, backgroundColor: `${team.color}12` }}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
        <input value={L(team.name)} onChange={(e) => renameTeam(team.id, e.target.value)} aria-label={L({ en: "Department name", th: "ชื่อแผนก" })} className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-0.5 text-[12.5px] font-semibold text-white/90 transition hover:border-white/10 focus:border-brand-400/40 focus:bg-white/[0.04] focus:outline-none" />
        {confirmDel ? (
          <span className="flex shrink-0 items-center gap-0.5">
            <button onClick={() => removeTeam(team.id)} title={L({ en: "Confirm delete", th: "ยืนยันลบ" })} className="grid h-5 w-5 place-items-center rounded bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"><Check size={12} /></button>
            <button onClick={() => setConfirmDel(false)} title={L({ en: "Cancel", th: "·เลิก" })} className="grid h-5 w-5 place-items-center rounded text-white/40 hover:text-white/70"><X size={12} /></button>
          </span>
        ) : (
          <button onClick={() => setConfirmDel(true)} title={L({ en: "Delete department", th: "ลบแผนก" })} className="grid h-5 w-5 shrink-0 place-items-center rounded text-white/25 transition hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={12} /></button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {leader ? <Avatar p={leader} color={team.color} size={30} locale={locale} /> : null}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 truncate text-[12.5px] font-medium text-white/90"><Crown size={10} className="shrink-0" style={{ color: team.color }} />{leader ? L(leader.name) : "—"}</p>
          <p className="truncate text-[9.5px] text-white/45">{L({ en: "Leader", th: "หัวหน้า" })}{leader ? ` · ${L(leader.trade)}` : ""}</p>
        </div>
      </div>
      <select value={team.leaderId} onChange={(e) => setLeader(team.id, e.target.value)} title={L({ en: "Change leader", th: "เปลี่ยนหัวหน้า" })} className="mt-1.5 w-full rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1 text-[11px] text-white/75 focus:border-brand-400/50 focus:outline-none">
        {people.map((p) => <option key={p.id} value={p.id}>{L(p.name)}</option>)}
      </select>
      {leader ? (
        <div className="mt-1.5 space-y-1">
          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-1.5 py-1 focus-within:border-brand-400/40">
            <Phone size={11} className="shrink-0 text-white/40" />
            <input value={leader.phone} onChange={(e) => updatePerson(leader.id, { phone: e.target.value })} autoComplete="off" inputMode="tel" placeholder={L({ en: "phone", th: "เบอร์โทร" })} className="min-w-0 flex-1 bg-transparent text-[10.5px] text-white/80 placeholder:text-white/30 focus:outline-none" />
          </label>
          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-1.5 py-1 focus-within:border-brand-400/40">
            <Mail size={11} className="shrink-0 text-white/40" />
            <input value={leader.email} onChange={(e) => updatePerson(leader.id, { email: e.target.value })} autoComplete="off" inputMode="email" placeholder={L({ en: "email", th: "อีเมล" })} className="min-w-0 flex-1 bg-transparent text-[10.5px] text-white/80 placeholder:text-white/30 focus:outline-none" />
          </label>
        </div>
      ) : null}
      {coverage.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1" title={L({ en: "Team coverage (from crew) — edit per person in the roster", th: "พื้นที่ที่ทีมนี้ดูแล (รวมจากช่าง) — แก้รายคนได้ในรายชื่อช่าง" })}>
          {coverage.map((l) => <span key={l} className="rounded bg-white/[0.06] px-1 py-0.5 text-[9px] text-white/55">{l}</span>)}
        </div>
      ) : <p className="mt-1.5 text-[9.5px] text-white/30">{L({ en: "no section assigned", th: "ยังไม่มีพื้นที่ดูแล" })}</p>}
    </div>
  );
}

function CrewNode({ person, team, locale, L }: { person: Person; team: Team; locale: string; L: (o: LZ) => string }) {
  const contact = [person.phone, person.email].filter(Boolean).join(" · ");
  return (
    <div title={`${L(person.name)} · ${L(person.trade)}${contact ? `\n${contact}` : ""}`} className="group relative flex w-[96px] flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-1.5 py-2 text-center">
      <Avatar p={person} color={team.color} size={26} locale={locale} />
      <span className="w-full truncate text-[11px] font-medium text-white/85">{L(person.name)}</span>
      <span className="w-full truncate text-[9px] text-white/40">{L(person.trade)}</span>
      {person.phone ? (
        <span className="flex w-full items-center justify-center gap-0.5 truncate text-[8.5px] text-white/35"><Phone size={8} className="shrink-0" />{person.phone}</span>
      ) : null}
      <button onClick={() => removeMember(team.id, person.id)} title={L({ en: "Remove from department", th: "เอาออกจากแผนก" })} className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full border border-white/15 bg-ink-900 text-white/50 transition hover:text-rose-300 group-hover:grid"><X size={11} /></button>
    </div>
  );
}

function AddCrewNode({ team, available, L }: { team: Team; available: Person[]; L: (o: LZ) => string }) {
  return (
    <div className="flex w-[96px] items-center justify-center rounded-lg border border-dashed border-white/15 px-1 py-3">
      <select value="" onChange={(e) => { if (e.target.value) addMember(team.id, e.target.value); }} title={L({ en: "Add crew", th: "เพิ่มช่าง" })} className="w-full cursor-pointer bg-transparent text-center text-[10.5px] text-white/55 focus:outline-none">
        <option value="">+ {L({ en: "crew", th: "เพิ่มช่าง" })}</option>
        {available.map((p) => <option key={p.id} value={p.id}>{L(p.name)}</option>)}
      </select>
    </div>
  );
}

