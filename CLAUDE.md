# SPAREX FACTORYOS — ตัวหลัก (demo + dev)

Next.js 15 + React 19 + TS + Tailwind + React Three Fiber (3D digital twin) + Framer Motion. i18n EN/TH (`useI18n()`, `L({en,th})`, dict ใน `lib/tr/*`). Dev local: `npm run dev` → port 3400.

## เวอร์ชันที่มีอยู่ (แยกกัน 3 ตัว)
- **sparexth.com/demo** — ตัวลูกค้าเห็น (เสถียร) · **sparexth.com/dev** — ตัวทำงาน (deploy อัตโนมัติที่นี่)
- **sparexth.com/hosei** — เวอร์ชันขายจริงลูกค้า Hosei อยู่คนละโปรเจค `Documents/factoryos-hosei` (fork แยกขาด ห้าม sync ไปมาโดยไม่ถูกสั่ง)

## กติกาผู้ใช้ (ยึดเสมอ)
- **ห้ามใช้คำว่า "สด"** — Live = "ปัจจุบัน"/"ขณะนี้" · ภาษาไทยแปลตามหน้าที่ ไม่แปลตามคำ
- ทุกโมดูล workflow 5 ขั้น: 01 เฝ้าดู → 02 อินไซต์ → 03 วิเคราะห์ด้วย AI → 04 คำแนะนำ & ลงมือ (Zero-Invest/Invest + BOM) → 05 รายงาน — AI เฉพาะขั้น 3/4
- Subtitle การ์ดต้องบอกว่าการ์ดตอบคำถามอะไร (ดู skill `.claude/skills/factoryos-card-subtitles`)
- **STANDING RULE deploy:** แก้เสร็จ + `npx tsc --noEmit` ผ่าน → deploy ขึ้น **/dev อัตโนมัติโดยไม่ต้องถาม** · **/demo ขยับเฉพาะเมื่อผู้ใช้พิมพ์ "promote"** — ห้าม chain build-dev && promote-demo

## Deploy (จากเครื่องไหนก็ได้ที่มี ssh key)
EC2 ใช้ร่วมหลายระบบ: `18.235.152.233` (Elastic IP ถาวร, t3.small 2GB+4G swap, Amazon Linux 2023, `ssh -i ~/.ssh/sparex-production.pem ec2-user@18.235.152.233`) — key อยู่ OneDrive `SpareX Company Limited/CODE/AWS Server/sparex-production.pem` (copy ไป `~/.ssh/` chmod 600). เครื่องนี้รัน AIVA + demo(:3005)/dev(:3006) + connect(:3007) + budget(:3008) + hosei(:3009) — **ห้ามแตะของที่ไม่เกี่ยว**. Router = Caddy ใน docker (`aiva-caddy-1`), config `/home/ec2-user/AIVA/Caddyfile`.

**ขั้นตอน redeploy /dev:**
1. `npx tsc --noEmit` ต้องผ่าน
2. จากโฟลเดอร์แม่: `tar --exclude=sparex-factoryos/node_modules --exclude=sparex-factoryos/.next --exclude=sparex-factoryos/.git --exclude=sparex-factoryos/.env.local --exclude=sparex-factoryos/backend/node_modules --exclude=sparex-factoryos/backend/dist -czf <temp>/factoryos-deploy.tgz sparex-factoryos`
3. `scp` ไป `/var/tmp/` → ssh: extract `/var/tmp/src` → `rsync -a --delete --exclude node_modules --exclude .next /var/tmp/src/sparex-factoryos/ /opt/sparex-factoryos-dev/`
4. `nohup bash /opt/build-dev.sh > /var/tmp/build-dev.log 2>&1 &` (ราว 8 นาที) → poll log จน `BUILD_DEV_ALL_DONE`
5. promote (เมื่อถูกสั่งเท่านั้น): `sudo bash /opt/promote-demo.sh`

**ข้อควรระวังเซิร์ฟเวอร์:** `/tmp` เป็น tmpfs เล็ก ใช้ `/var/tmp` เสมอ · build นานต้อง `nohup` (ssh หลุดแล้วตาย; exit 255 หลัง nohup = ปกติ) · server build ใช้ `SKIP_TYPECHECK=1` + heap 2048 (tsc gate ที่ local) · `next dev` บนเซิร์ฟเวอร์ใช้ไม่ได้ · secrets ใน `/opt/factoryos.env` (SMTP OTP/lead, ADMIN_KEY, SUPPORT_KEY) — ห้าม commit

## กฎโค้ดที่เจ็บมาแล้ว
- Route files (`app/api/**/route.ts`) ห้าม export อะไรนอกจาก HTTP methods — helper ไป `lib/` (fs-side ใส่ `import "server-only"`)
- Client fetch ทุกจุดผ่าน `publicAsset()` จาก `lib/paths` (basePath /dev /demo bake ตอน build)
- Overlay เต็มจอใช้ `createPortal(document.body)` + ปิด DigitalTwin ข้างหลัง (drei Html z-index ทะลุ)
- พิกัดใน SVG editor ใช้ `getScreenCTM().inverse()` เท่านั้น
- แก้ไฟล์มีข้อความไทยด้วย PowerShell ห้ามใช้ Get/Set-Content (double-encode พัง) — ใช้ Edit tool
- Append-only NDJSON + fold (first-claim-wins) สำหรับข้อมูล multi-writer (support tickets) — ยังไม่มี DB

## ระบบสำคัญในโค้ด
- **Twin Builder** (`lib/twin-builder.ts`, `components/twin/TwinBuilder.tsx`): ผู้ใช้จัดผังเอง (คลัง 26 เครื่องสาย automotive, drag&drop, โซน+ลากขอบ, MDB/เสาไฟเป็นของเลือกวาง), layout ใน localStorage → `toAssets/toBuildings/poleOf` เข้า 3D เดิม; flow ไฟฟ้า generate จากผัง; ป้ายลอย per-machine; หน้า twin มี "ดูเฉพาะ" รายโซน; จอ TV `/os/twin/monitor?zone=..&cards=..&cycle=15`
- **Support tickets** (`lib/support.ts` + `/support` + `/admin/tickets`): ลูกค้าแชท → freelance กดรับ (first-claim-wins) → L1/150 L2/400 L3/800 ×โบนัสรอ → ดาว → admin อนุมัติจ่าย
- **Demo funnel:** OTP login อีเมลจริง → UsageTracker (`/admin/analytics`) → lead ทุกฟอร์ม + PackageBanner → อีเมล admin@sparexth.com
- แผนผลิตกรอกเองได้ใน Production (`PlanVsActualPanel`, localStorage)
