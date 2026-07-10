import fs from "node:fs";

const file = process.argv[2] ?? "sparexth-demo-export/_next/static/chunks/app/os/energy/page-d07a32cf84c066f7.js";
const apply = process.argv.includes("--apply");

const decoder874 = new TextDecoder("windows-874");
const inverse874 = new Map();
for (let b = 0; b <= 255; b += 1) {
  const ch = decoder874.decode(Uint8Array.of(b));
  if (ch !== "\uFFFD" && !inverse874.has(ch)) inverse874.set(ch, b);
}

const placeholders = [
  ["@@EMDASH@@", "—"],
  ["@@ENDASH@@", "–"],
  ["@@ARROW@@", "→"],
  ["@@DOT@@", "·"],
  ["@@ELLIPSIS@@", "…"],
  ["@@TM@@", "™"],
  ["@@CHECK@@", "✓"],
  ["@@WARN@@", "⚠"],
  ["@@BAHT@@", "฿"],
];

function protect(s) {
  let out = s;
  for (const [token, ch] of placeholders) out = out.split(ch).join(token);
  return out;
}

function restore(s) {
  let out = s;
  for (const [token, ch] of placeholders) out = out.split(token).join(ch);
  return out;
}

function encode874(s) {
  const bytes = [];
  for (const ch of protect(s)) {
    const b = inverse874.get(ch);
    if (b === undefined) return null;
    bytes.push(b);
  }
  return Uint8Array.from(bytes);
}

function countBad(s) {
  const c1 = (s.match(/[\u0080-\u009F]/g) || []).length;
  const thaiMojibake = (s.match(/เธ|เน\\x|เน€|โ\\x|เธฟ|เธงเธ|เธ|เธ|เธ/g) || []).length;
  return c1 * 3 + thaiMojibake;
}

function repairRuntimeString(s) {
  let next = s
    .replaceAll("ยท", "·")
    .replaceAll("เธฟ", "฿")
    .replaceAll("โ€ฆ", "…")
    .replaceAll("โ€“", "–")
    .replaceAll("โ€”", "—")
    .replaceAll("โ’", "→")
    .replaceAll("โข", "™");

  const badBefore = countBad(next);
  if (badBefore > 0) {
    const bytes = encode874(next);
    if (bytes) {
      const repaired = restore(Buffer.from(bytes).toString("utf8"));
      if (!repaired.includes("\uFFFD") && countBad(repaired) < badBefore) next = repaired;
    }
  }

  return next
    .replaceAll("undervoltage dip", "ไฟตก")
    .replaceAll("overvoltage", "แรงดันเกิน")
    .replaceAll("filtering →", "กำลังกรอง →")
    .replaceAll("filtering", "กำลังกรอง")
    .replaceAll("times today", "ครั้งวันนี้")
    .replaceAll("disturbance detection", "ตรวจจับความผิดปกติ")
    .replaceAll("Disturbances today", "เหตุการณ์วันนี้")
    .replaceAll("Detected events", "เหตุการณ์ที่ตรวจพบ")
    .replaceAll("No events of this type today", "วันนี้ไม่มีเหตุการณ์ประเภทนี้")
    .replaceAll("no disturbances detected", "ไม่พบความผิดปกติ")
    .replaceAll("more events", "เหตุการณ์เพิ่มเติม");
}

function decodeJsBody(body) {
  return body
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(Number.parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(Number.parseInt(h, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function encodeJsBody(body) {
  return body
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, (ch) => `\\x${ch.charCodeAt(0).toString(16).padStart(2, "0")}`);
}

function repairDoubleQuotedStrings(text) {
  let changed = 0;
  const repaired = text.replace(/"((?:\\.|[^"\\])*)"/gs, (full, body) => {
    const decoded = decodeJsBody(body);
    const fixed = repairRuntimeString(decoded);
    if (fixed === decoded) return full;
    changed += 1;
    return `"${encodeJsBody(fixed)}"`;
  });
  return { repaired, changed };
}

if (!fs.existsSync(file)) {
  console.error(`Bundle not found: ${file}`);
  process.exit(1);
}

const before = fs.readFileSync(file, "utf8");
const { repaired, changed } = repairDoubleQuotedStrings(before);
const after = repaired
  .replaceAll("โ\\x86“", "→")
  .replaceAll("โ\\x86’", "→")
  .replaceAll("เธฟ", "฿")
  .replaceAll("ยท", "·");

console.log(`${apply ? "patched" : "would patch"} ${changed} string literals in ${file}`);
if (apply) fs.writeFileSync(file, after, "utf8");
