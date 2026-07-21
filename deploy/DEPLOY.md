# เอา SpareX FactoryOS ขึ้น AWS EC2

ตัวเดโม่รันแค่ Next.js ตัวเดียว (ข้อมูล mock ในตัว ไม่ต้องมี database/backend)
ทั้งหมดมี 3 ขั้น ใช้เวลา ~15 นาที

## 1) สร้าง EC2 (ทำครั้งเดียวใน AWS Console)

- **Region:** ap-southeast-1 (สิงคโปร์) — ใกล้ไทยสุด
- **AMI:** Ubuntu Server 24.04 LTS
- **Instance type:** `t3.small` (2 vCPU / 2 GB) ≈ **$15–17/เดือน** ← แนะนำ
  (ประหยัดสุด `t3.micro` ≈ $7.5/เดือน ก็รันได้ — สคริปต์ใส่ swap 2G ให้แล้วกัน build ล้ม)
- **Key pair:** สร้างใหม่ (.pem) เก็บไว้ใช้ SSH
- **Security group:** เปิด inbound
  - `22 (SSH)` — เฉพาะ IP ของเรา (My IP)
  - `80 (HTTP)` — Anywhere
  - `443 (HTTPS)` — Anywhere (เผื่อทำ SSL ทีหลัง)
- **Storage:** 20 GB gp3

## 2) เอาโค้ดขึ้นเครื่อง

ทางใดทางหนึ่ง:

**A. ผ่าน git (แนะนำ — redeploy ง่าย):** push โปรเจกต์ขึ้น GitHub (private ได้) แล้วบนเครื่อง EC2:
```bash
sudo git clone https://github.com/<you>/sparex-factoryos.git /opt/sparex-factoryos
```

**B. ผ่าน scp จากเครื่องเรา (ไม่ต้องมี GitHub):**
```powershell
# จากเครื่อง Windows (PowerShell) — ตัด node_modules/.next ออกก่อนด้วย tar
cd C:\Users\uSeR\Documents
tar --exclude=node_modules --exclude=.next -czf factoryos.tgz sparex-factoryos
scp -i key.pem factoryos.tgz ubuntu@<EC2-IP>:/tmp/
ssh -i key.pem ubuntu@<EC2-IP> "sudo mkdir -p /opt && sudo tar -xzf /tmp/factoryos.tgz -C /opt && sudo mv /opt/sparex-factoryos /opt/sparex-factoryos 2>/dev/null; true"
```

## 3) รันสคริปต์ตัวเดียวจบ

```bash
ssh -i key.pem ubuntu@<EC2-IP>
sudo bash /opt/sparex-factoryos/deploy/ec2-setup.sh
```

สคริปต์จะ: ใส่ swap → ลง Node 20 + pm2 + nginx → `npm ci && npm run build` →
รัน `next start` ผ่าน pm2 (รีสตาร์ตเอง/รอดรีบูต) → ตั้ง nginx proxy พอร์ต 80

เสร็จแล้วเปิด **http://<EC2-IP>/** ได้เลย

## Redeploy เมื่อแก้โค้ด

```bash
cd /opt/sparex-factoryos && git pull && npm run build && pm2 restart factoryos
```

## เพิ่มเติม (ยังไม่บังคับ)

- **โดเมน + HTTPS:** ชี้ A record มาที่ IP แล้ว `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`
- **Elastic IP:** ผูกไว้กันหลุดเวลา stop/start instance (ฟรีถ้าผูกกับเครื่องที่รันอยู่)
- **backend/ (Fastify + MQTT):** ยังไม่ต้อง deploy — เดโม่ไม่ได้เรียกใช้ ถ้าจะต่อของจริงค่อยเปิด docker-compose ในโฟลเดอร์ backend
