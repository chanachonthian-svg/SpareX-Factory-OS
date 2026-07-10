import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const decoder = new TextDecoder("windows-874");

const inverse874 = new Map();
for (let b = 0; b <= 255; b += 1) {
  const ch = decoder.decode(Uint8Array.of(b));
  if (ch !== "\uFFFD" && !inverse874.has(ch)) inverse874.set(ch, b);
}

const markerRe = /(เธ|เน|โ€|โ€”|โ|โ|โ|ยท|ยก|ร—|ใ|ใ|ใ|ไธ|ๆ|ๅ|่)/;
const badRe = /(เธ|เน|โ€|โ€”|โ|โ|โ|ยท|ยก|ร—|ใ|ใ|ใ|ไธ|ๆ|ๅ|่|�)/g;
const replacementRe = /\uFFFD/g;

const simple = [
  ["โ€”", "—"],
  ["โ€“", "–"],
  ["โ€ฆ", "…"],
  ["โ€", "‘"],
  ["โ€™", "’"],
  ["โ€", "“"],
  ["โ€", "”"],
  ["โ’", "→"],
  ["โ", "←"],
  ["โ‘", "↑"],
  ["โ“", "↓"],
  ["โ¢", "™"],
  ["โ", "≈"],
  ["โค", "≤"],
  ["โฅ", "≥"],
  ["ยท", "·"],
  ["ยก", "·"],
  ["ร—", "×"],
  ["รฐ", "°"],
  ["เธฟ", "฿"],
];

function countBad(s) {
  return (s.match(badRe) || []).length;
}

function encodeWindows874(s) {
  const bytes = [];
  for (const ch of s) {
    const b = inverse874.get(ch);
    if (b === undefined) return null;
    bytes.push(b);
  }
  return Uint8Array.from(bytes);
}

function repair874(s) {
  if (!markerRe.test(s)) return s;
  const bytes = encodeWindows874(s);
  if (!bytes) return s;
  const repaired = Buffer.from(bytes).toString("utf8");
  if (replacementRe.test(repaired)) return s;
  if (countBad(repaired) >= countBad(s)) return s;
  return repaired;
}

function repairStringLiteral(raw) {
  const quote = raw[0];
  const body = raw.slice(1, -1);
  if (!markerRe.test(body)) return raw;
  const repaired = repair874(body);
  if (repaired !== body) return `${quote}${repaired}${quote}`;
  return raw;
}

function repairFile(text) {
  let next = text;
  for (const [from, to] of simple) next = next.split(from).join(to);

  next = next.replace(/"((?:\\.|[^"\\])*)"/gs, (m) => repairStringLiteral(m));
  next = next.replace(/'((?:\\.|[^'\\])*)'/gs, (m) => repairStringLiteral(m));
  next = next.replace(/`((?:\\.|[^`\\])*)`/gs, (m) => repairStringLiteral(m));
  return next;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".netlify", "sparexth-demo-export", "netlify-export", "dist", ".git", "scripts"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|css|md)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const changed = [];
for (const file of walk(root)) {
  const before = fs.readFileSync(file, "utf8");
  const after = repairFile(before);
  if (after !== before) {
    changed.push(path.relative(root, file));
    if (apply) fs.writeFileSync(file, after, "utf8");
  }
}

console.log(`${apply ? "repaired" : "would repair"} ${changed.length} files`);
for (const file of changed) console.log(file);
