/* Nocturne Ledger — concept canvas for the two Insight cards.
 * Left: bill stratigraphy (cost layers). Right: night baseload horizon. */
const sharp = require("C:/Users/uSeR/Documents/sparex-factoryos/node_modules/sharp");

const W = 1600, H = 1000;
const INK = "#070b12", PANEL = "#0a1019";
const WHITE = "#e6edf7", MUTE = "rgba(230,237,247,0.42)", FAINT = "rgba(230,237,247,0.16)", HAIR = "rgba(230,237,247,0.08)";
const MONO = "Consolas", SANS = "Segoe UI";
const P = [];

function txt(x, y, s, { size = 12, fill = MUTE, family = SANS, weight = 300, anchor = "start", track = 0 } = {}) {
  P.push(`<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${track ? ` letter-spacing="${track}"` : ""}>${s}</text>`);
}
function line(x1, y1, x2, y2, stroke, w = 1, opts = "") {
  P.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" ${opts}/>`);
}
function rect(x, y, w, h, fill, opts = "") {
  P.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${opts}/>`);
}

P.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
P.push(`<rect width="${W}" height="${H}" fill="${INK}"/>`);
P.push(`<rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="22" fill="${PANEL}" stroke="rgba(230,237,247,0.10)"/>`);

/* header */
txt(84, 104, "NOCTURNE LEDGER", { size: 34, fill: WHITE, weight: 200, track: 10 });
txt(84, 130, "THE STRATIGRAPHY OF EXPENDITURE · ENERGY INTELLIGENCE · 02 INSIGHT", { size: 12, fill: MUTE, track: 4 });
txt(1516, 104, "FIG. 04 – 05", { size: 12, family: MONO, fill: FAINT, anchor: "end", track: 3 });
line(84, 152, 1516, 152, HAIR, 1);
line(800, 190, 800, 900, HAIR, 1);

/* ═══════════════════════ FIG 04 — BILL STRATIGRAPHY ═══════════════════════ */
txt(84, 208, "FIG. 04", { size: 10, family: MONO, fill: FAINT, track: 3 });
txt(84, 236, "BILL BREAKDOWN — WHERE THE MONTH SETTLES", { size: 14, fill: WHITE, weight: 400, track: 4 });
txt(84, 300, "฿1.15M", { size: 52, family: MONO, fill: WHITE, weight: 400 });
txt(268, 300, "MTD · 20 DB METERS · TRACEABLE", { size: 10, fill: FAINT, track: 3 });

const CX0 = 150, CW = 170, CY0 = 340, CH = 520;
const layers = [
  { name: "ON-PEAK ENERGY", thb: "฿700,400", pct: 61, color: "#f59e0b", vein: "#fbbf24", note: "09:00–22:00 · ฿4.19/kWh" },
  { name: "OFF-PEAK ENERGY", thb: "฿218,100", pct: 19, color: "#34d399", vein: "#6ee7b7", note: "22:00–09:00 · ฿2.60/kWh" },
  { name: "DEMAND CHARGE", thb: "฿172,300", pct: 15, color: "#fb923c", vein: "#fdba74", note: "peak 15-min · 1,455 kW" },
  { name: "FT + SERVICE", thb: "฿46,400", pct: 4, color: "#64748b", vein: "#94a3b8", note: "pass-through" },
  { name: "PF PENALTY", thb: "฿0", pct: 1, color: "#f43f5e", vein: "#fb7185", note: "armed — ฿3,600 if PF &lt; 0.85", dashed: true },
];
/* day ticks left of the core — 26 working days of deposition */
for (let i = 0; i <= 26; i++) {
  const y = CY0 + (i / 26) * CH;
  line(CX0 - 14, y, CX0 - (i % 5 === 0 ? 4 : 8), y, i % 5 === 0 ? FAINT : HAIR, 1);
}
let ly = CY0;
layers.forEach((l, idx) => {
  const lh = Math.max(8, (l.pct / 100) * CH);
  if (l.dashed) {
    P.push(`<rect x="${CX0}" y="${ly}" width="${CW}" height="${lh}" fill="none" stroke="${l.color}" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.8"/>`);
  } else {
    P.push(`<rect x="${CX0}" y="${ly}" width="${CW}" height="${lh}" fill="${l.color}" opacity="0.16"/>`);
    P.push(`<rect x="${CX0}" y="${ly}" width="6" height="${lh}" fill="${l.vein}" opacity="0.9"/>`);
    P.push(`<rect x="${CX0}" y="${ly}" width="${CW}" height="1.5" fill="${l.vein}" opacity="0.55"/>`);
  }
  /* leader to ledger entries on the right */
  const midY = ly + lh / 2;
  const entryY = CY0 + 30 + idx * 96;
  line(CX0 + CW, midY, CX0 + CW + 36, entryY, l.dashed ? l.color : FAINT, 0.9, 'opacity="0.7"');
  line(CX0 + CW + 36, entryY, CX0 + CW + 62, entryY, l.dashed ? l.color : FAINT, 0.9, 'opacity="0.7"');
  const ex = CX0 + CW + 74;
  txt(ex, entryY - 12, l.name, { size: 10.5, fill: l.dashed ? "#fb7185" : MUTE, track: 3, weight: 400 });
  txt(ex, entryY + 14, l.thb, { size: 24, family: MONO, fill: l.dashed ? "#fb7185" : WHITE, weight: 400 });
  txt(ex + 148, entryY + 14, `${l.pct}%`, { size: 12, family: MONO, fill: FAINT });
  txt(ex, entryY + 32, l.note, { size: 9.5, fill: FAINT, track: 1 });
  ly += lh;
});
txt(CX0, CY0 + CH + 34, "CORE SAMPLE — JULY", { size: 9, fill: FAINT, track: 4 });
txt(CX0 - 20, CY0 - 14, "DAY 1", { size: 8.5, family: MONO, fill: FAINT });
txt(CX0 - 20, CY0 + CH + 14, "DAY 26", { size: 8.5, family: MONO, fill: FAINT });

/* ═══════════════════════ FIG 05 — NIGHT BASELOAD ═══════════════════════ */
const NX = 864, NW = 616, NY = 340, NH = 300;
txt(NX, 208, "FIG. 05", { size: 10, family: MONO, fill: FAINT, track: 3 });
txt(NX, 236, "NIGHT BASELOAD — WHAT GLOWS WHILE THE PLANT SLEEPS", { size: 14, fill: WHITE, weight: 400, track: 4 });
txt(NX, 300, "412 kW", { size: 52, family: MONO, fill: "#fbbf24", weight: 400 });
txt(NX + 208, 284, "AVG 22:00–06:00", { size: 10, fill: FAINT, track: 3 });
txt(NX + 208, 302, "TARGET ≤ 300 kW", { size: 10, fill: "#67e8f9", track: 3 });

/* moon + stars */
P.push(`<circle cx="${NX + NW - 92}" cy="${NY + 24}" r="15" fill="#e6edf7" opacity="0.85"/>`);
P.push(`<circle cx="${NX + NW - 99}" cy="${NY + 19}" r="13" fill="${PANEL}"/>`);
[[NX + 380, NY + 24], [NX + 442, NY + 58], [NX + 500, NY + 20], [NX + 320, NY + 52], [NX + 540, NY + 70]].forEach(([x, y], i) => {
  P.push(`<circle cx="${x}" cy="${y}" r="${1 + (i % 2)}" fill="#e6edf7" opacity="0.5"/>`);
});

/* chart frame */
const kwMax = 500;
const yOf = (kw) => NY + NH - (kw / kwMax) * NH;
const hours = [22, 23, 0, 1, 2, 3, 4, 5, 6];
const load = [418, 406, 399, 402, 447, 409, 401, 396, 424];
const xOf = (i) => NX + (i / (hours.length - 1)) * NW;
[100, 200, 300, 400, 500].forEach((kw) => {
  line(NX, yOf(kw), NX + NW, yOf(kw), kw === 300 ? "rgba(103,232,249,0.55)" : HAIR, kw === 300 ? 1.2 : 1, kw === 300 ? 'stroke-dasharray="6 5"' : "");
  txt(NX - 10, yOf(kw) + 4, String(kw), { size: 9, family: MONO, fill: kw === 300 ? "#67e8f9" : FAINT, anchor: "end" });
});
txt(NX + NW, yOf(300) - 8, "TARGET DATUM · 300", { size: 9, family: MONO, fill: "#67e8f9", anchor: "end", track: 2 });

/* waste seam: between target and actual */
let seam = `M${xOf(0)},${yOf(300)} `;
load.forEach((kw, i) => { seam += `L${xOf(i)},${yOf(kw)} `; });
seam += `L${xOf(load.length - 1)},${yOf(300)} Z`;
P.push(`<path d="${seam}" fill="#f59e0b" opacity="0.22"/>`);
/* necessary base below target */
rect(NX, yOf(300), NW, NY + NH - yOf(300), "#22d3ee", 'opacity="0.045"');
/* load line */
let lp = "";
load.forEach((kw, i) => { lp += `${i ? "L" : "M"}${xOf(i)},${yOf(kw)} `; });
P.push(`<path d="${lp}" fill="none" stroke="#fbbf24" stroke-width="2"/>`);
load.forEach((kw, i) => P.push(`<circle cx="${xOf(i)}" cy="${yOf(kw)}" r="2.6" fill="#fbbf24"/>`));
/* the 02:00 anomaly — one rose fault line */
const ai = 4;
line(xOf(ai), yOf(load[ai]) - 8, xOf(ai), NY + 6, "#f43f5e", 1, 'stroke-dasharray="3 3" opacity="0.9"');
P.push(`<circle cx="${xOf(ai)}" cy="${yOf(load[ai])}" r="4.5" fill="none" stroke="#f43f5e" stroke-width="1.4"/>`);
txt(xOf(ai) - 10, NY + 22, "02:00 — RING-MAIN LEAK · COMP-10", { size: 9.5, family: MONO, fill: "#fb7185", track: 1, anchor: "end" });

/* hour ticks */
hours.forEach((h, i) => {
  line(xOf(i), NY + NH, xOf(i), NY + NH + 8, FAINT, 1);
  txt(xOf(i), NY + NH + 24, `${String(h).padStart(2, "0")}:00`, { size: 9.5, family: MONO, fill: FAINT, anchor: "middle" });
});

/* the waste arithmetic — a surveyor's ledger */
const LY = NY + NH + 70;
line(NX, LY - 24, NX + NW, LY - 24, HAIR, 1);
txt(NX, LY, "112 kW", { size: 20, family: MONO, fill: WHITE });
txt(NX + 110, LY, "× 8 h × 26 d × ฿2.60", { size: 13, family: MONO, fill: MUTE });
txt(NX + 380, LY, "=", { size: 16, family: MONO, fill: FAINT });
txt(NX + NW, LY, "฿60,570 / MO", { size: 24, family: MONO, fill: "#fbbf24", anchor: "end", weight: 400 });
txt(NX, LY + 26, "PURE WASTE — NOTHING WAS PRODUCED IN THESE HOURS", { size: 9.5, fill: FAINT, track: 3 });

/* footer */
line(84, 936, 1516, 936, HAIR, 1);
txt(84, 958, "EVERY FIGURE FROM METERS · NO MODELS, NO ESTIMATES — ARITHMETIC ONLY", { size: 9.5, fill: FAINT, track: 3 });
txt(1516, 958, "NOCTURNE LEDGER · SPAREX FACTORYOS", { size: 9.5, fill: FAINT, track: 3, anchor: "end" });

P.push("</svg>");
sharp(Buffer.from(P.join("\n"))).png().toFile(process.argv[2] || "nocturne.png").then(() => console.log("rendered"));
