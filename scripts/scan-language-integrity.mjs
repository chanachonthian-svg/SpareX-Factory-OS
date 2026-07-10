import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2);
const targets = roots.length ? roots : ["app", "components", "lib", "backend/src", "sparexth-demo-export/_next/static/chunks/app/os/energy"];
const skip = new Set(["node_modules", ".next", ".netlify", "netlify-export", "dist", ".git"]);

const badPatterns = [
  ["C1 control", /[\u0080-\u009F]/g],
  ["mojibake เธ", /เธ/g],
  ["mojibake โ€", /โ€/g],
  ["mojibake โ", /โ/g],
  ["mojibake โ", /โ/g],
  ["mojibake ยท", /ยท/g],
  ["literal escaped mojibake", /\\x8[0-9a-fA-F]|\\x9[0-9a-fA-F]/g],
];

const mixedEnglish = [
  ["undervoltage dip", /undervoltage dip/g],
  ["filtering", /filtering/g],
  ["times today", /times today/g],
];

function walk(entry, out = []) {
  if (!fs.existsSync(entry)) return out;
  const st = fs.statSync(entry);
  if (st.isFile()) {
    if (/\.(ts|tsx|js|jsx|mjs|css|md)$/.test(entry)) out.push(entry);
    return out;
  }
  for (const child of fs.readdirSync(entry, { withFileTypes: true })) {
    if (skip.has(child.name)) continue;
    walk(path.join(entry, child.name), out);
  }
  return out;
}

const failures = [];
for (const file of targets.flatMap((target) => walk(target))) {
  const text = fs.readFileSync(file, "utf8");
  for (const [name, re] of [...badPatterns, ...mixedEnglish]) {
    const matches = text.match(re);
    if (matches?.length) {
      failures.push({ file, name, count: matches.length });
    }
  }
}

if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log("language integrity scan passed");
