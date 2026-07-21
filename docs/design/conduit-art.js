/* Conduit — concept sheet for the redesigned 5-stage workflow bar. */
const sharp = require("C:/Users/uSeR/Documents/sparex-factoryos/node_modules/sharp");

const W = 1600, H = 1000;
const INK = "#070b12", PANEL = "#0b111c";
const CYAN = "#22d3ee", CYAN_HI = "#a5f3fc", INDIGO = "#818cf8", EMERALD = "#34d399";
const WHITE = "#e9f0f9", MUTE = "rgba(233,240,249,0.44)", FAINT = "rgba(233,240,249,0.16)", HAIR = "rgba(233,240,249,0.07)";
const MONO = "Consolas", SANS = "Segoe UI";
const P = [];
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const t = (x, y, s, o = {}) => P.push(`<text x="${x}" y="${y}" font-family="${o.f || SANS}" font-size="${o.s || 12}" font-weight="${o.w || 300}" fill="${o.fill || MUTE}" text-anchor="${o.a || "start"}"${o.tr ? ` letter-spacing="${o.tr}"` : ""}>${esc(s)}</text>`);
const line = (x1, y1, x2, y2, st, w = 1, o = "") => P.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st}" stroke-width="${w}" ${o}/>`);

/* ---- stages ---- */
const STAGES = [
  { n: "01", label: "Monitor", glyph: "pulse", ai: false },
  { n: "02", label: "Insight", glyph: "bars", ai: false },
  { n: "03", label: "AI Analysis", glyph: "spark", ai: true },
  { n: "04", label: "Recommend & Act", glyph: "bot", ai: true },
  { n: "05", label: "Report", glyph: "doc", ai: false },
];

function glyph(kind, cx, cy, col) {
  const s = 11;
  switch (kind) {
    case "pulse": return `<path d="M${cx - s},${cy} h4 l2,-6 l3,12 l2,-6 h4" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "bars": return [[-8, 4], [-3, -2], [2, 1], [7, -6]].map(([x, y], i) => `<rect x="${cx + x}" y="${cy + y}" width="3.4" height="${cy + 8 - (cy + y)}" rx="1" fill="${col}"/>`).join("");
    case "spark": return `<path d="M${cx},${cy - 9} l2.2,6.8 l6.8,2.2 l-6.8,2.2 l-2.2,6.8 l-2.2,-6.8 l-6.8,-2.2 l6.8,-2.2 Z" fill="${col}"/>`;
    case "bot": return `<rect x="${cx - 8}" y="${cy - 6}" width="16" height="12" rx="3" fill="none" stroke="${col}" stroke-width="1.7"/><circle cx="${cx - 3}" cy="${cy}" r="1.5" fill="${col}"/><circle cx="${cx + 3}" cy="${cy}" r="1.5" fill="${col}"/><line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy - 10}" stroke="${col}" stroke-width="1.7"/>`;
    case "doc": return `<rect x="${cx - 6}" y="${cy - 9}" width="12" height="18" rx="2" fill="none" stroke="${col}" stroke-width="1.6"/><line x1="${cx - 3}" y1="${cy - 4}" x2="${cx + 3}" y2="${cy - 4}" stroke="${col}" stroke-width="1.4"/><line x1="${cx - 3}" y1="${cy}" x2="${cx + 3}" y2="${cy}" stroke="${col}" stroke-width="1.4"/><line x1="${cx - 3}" y1="${cy + 4}" x2="${cx + 1}" y2="${cy + 4}" stroke="${col}" stroke-width="1.4"/>`;
  }
  return "";
}

/* draws one full 5-stage bar at (x0,y0), width bw, with `active` index; done < active */
function bar(x0, y0, bw, active) {
  const pitch = bw / STAGES.length;
  const railY = y0 + 96;
  const cxs = STAGES.map((_, i) => x0 + pitch * (i + 0.5));
  const railX0 = cxs[0], railX1 = cxs[cxs.length - 1];
  // rail base
  line(railX0, railY, railX1, railY, HAIR, 3);
  // energised portion up to active node
  P.push(`<defs><linearGradient id="rail${y0}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${EMERALD}"/><stop offset="0.55" stop-color="${CYAN}"/><stop offset="1" stop-color="${CYAN_HI}"/></linearGradient></defs>`);
  line(railX0, railY, cxs[active], railY, `url(#rail${y0})`, 3, 'stroke-linecap="round" opacity="0.9"');
  // travelling pulse on the next segment
  if (active < STAGES.length - 1) {
    const px = cxs[active] + (pitch * 0.42);
    P.push(`<circle cx="${px}" cy="${railY}" r="2.6" fill="${CYAN_HI}" opacity="0.9"/>`);
    for (let k = 1; k <= 3; k++) P.push(`<circle cx="${px - k * 7}" cy="${railY}" r="1.6" fill="${CYAN}" opacity="${0.5 - k * 0.13}"/>`);
  }

  STAGES.forEach((st, i) => {
    const cx = cxs[i];
    const isActive = i === active, done = i < active;
    const accent = st.ai ? INDIGO : CYAN;
    // node stem down to rail
    line(cx, y0 + 62, cx, railY - 5, done ? CYAN : isActive ? accent : FAINT, done || isActive ? 2 : 1, isActive ? "" : done ? "" : 'stroke-dasharray="2 3"');
    // node dot on rail
    P.push(`<circle cx="${cx}" cy="${railY}" r="${isActive ? 5 : 3.4}" fill="${done ? EMERALD : isActive ? accent : "#1a2536"}" stroke="${done || isActive ? "rgba(255,255,255,0.7)" : FAINT}" stroke-width="1.2"/>`);

    // token (number tile)
    const tileY = y0 + 8, tW = 34, tH = 26, tx = cx - 66;
    if (isActive) {
      P.push(`<rect x="${tx}" y="${tileY}" width="${tW}" height="${tH}" rx="8" fill="${accent}" opacity="0.16"/>`);
      P.push(`<rect x="${tx}" y="${tileY}" width="${tW}" height="${tH}" rx="8" fill="none" stroke="${accent}" stroke-width="1.3"/>`);
    } else {
      P.push(`<rect x="${tx}" y="${tileY}" width="${tW}" height="${tH}" rx="8" fill="rgba(255,255,255,0.04)"/>`);
    }
    if (done) {
      P.push(`<path d="M${tx + 11},${tileY + 13} l4,4 l8,-9" fill="none" stroke="${EMERALD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
    } else {
      t(tx + tW / 2, tileY + 18, st.n, { f: MONO, s: 14, w: 700, fill: isActive ? WHITE : MUTE, a: "middle" });
    }

    // glyph
    const gx = cx - 20, gy = tileY + 13;
    P.push(glyph(st.glyph, gx, gy, isActive ? accent : done ? "rgba(233,240,249,0.5)" : FAINT));

    // label
    const labelX = cx - 4;
    t(labelX, tileY + 18, st.label, { s: 13, w: isActive ? 500 : 400, fill: isActive ? WHITE : done ? "rgba(233,240,249,0.6)" : MUTE });

    // AI seal — placed just past the label so it never overlaps
    if (st.ai) {
      const labelW = st.label.length * 6.7;
      const sx = labelX + labelW + 8, sy = tileY + 4;
      P.push(`<rect x="${sx}" y="${sy}" width="22" height="14" rx="7" fill="${INDIGO}" opacity="${isActive ? 0.22 : 0.12}"/>`);
      t(sx + 11, sy + 10, "AI", { f: MONO, s: 8.5, w: 700, fill: isActive ? "#c7d2fe" : "rgba(199,210,254,0.7)", a: "middle", tr: 0.5 });
    }
  });
}

/* ================= canvas ================= */
P.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
P.push(`<rect width="${W}" height="${H}" fill="${INK}"/>`);
P.push(`<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="22" fill="${PANEL}" stroke="rgba(233,240,249,0.09)"/>`);

/* header */
t(80, 100, "CONDUIT", { s: 34, w: 200, fill: WHITE, tr: 14 });
t(80, 126, "A LIVE LINE FROM SENSING TO ACTION · WORKFLOW SPINE · SPAREX FACTORYOS", { s: 11.5, fill: MUTE, tr: 3.5 });
t(1516, 100, "FIG. 06", { f: MONO, s: 12, fill: FAINT, a: "end", tr: 3 });
line(80, 150, 1520, 150, HAIR, 1);

/* primary state — active at AI Analysis (03) */
t(80, 210, "STATE · MID-FLOW", { s: 10, fill: FAINT, tr: 3 });
P.push(`<rect x="80" y="228" width="1440" height="150" rx="16" fill="rgba(255,255,255,0.015)" stroke="${HAIR}"/>`);
bar(120, 250, 1360, 2);

/* secondary state — active at Monitor (01) */
t(80, 452, "STATE · ENTRY", { s: 10, fill: FAINT, tr: 3 });
P.push(`<rect x="80" y="470" width="1440" height="150" rx="16" fill="rgba(255,255,255,0.015)" stroke="${HAIR}"/>`);
bar(120, 492, 1360, 0);

/* third state — complete, active at Report (05) */
t(80, 694, "STATE · CLOSED", { s: 10, fill: FAINT, tr: 3 });
P.push(`<rect x="80" y="712" width="1440" height="150" rx="16" fill="rgba(255,255,255,0.015)" stroke="${HAIR}"/>`);
bar(120, 734, 1360, 4);

/* legend */
const ly = 918;
line(80, 892, 1520, 892, HAIR, 1);
const leg = [
  [CYAN, "energised rail · work has travelled this far"],
  [EMERALD, "closed stage · verified"],
  [INDIGO, "machine reasoning · AI junction"],
];
let lx = 80;
leg.forEach(([c, label]) => {
  P.push(`<circle cx="${lx + 5}" cy="${ly - 4}" r="4.5" fill="${c}"/>`);
  t(lx + 18, ly, label, { s: 10.5, fill: MUTE, tr: 0.5 });
  lx += 18 + label.length * 6.0 + 42;
});
t(1516, ly, "ONE RAIL · FIVE JUNCTIONS · ONE CURRENT", { s: 10, fill: FAINT, a: "end", tr: 3 });

P.push("</svg>");
sharp(Buffer.from(P.join("\n"))).png().toFile(process.argv[2] || "conduit.png").then(() => console.log("rendered"));
