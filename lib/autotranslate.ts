"use client";

import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/dict";
import { energyDict } from "@/lib/tr/energy";
import { operationsDict } from "@/lib/tr/operations";
import { assetsDict } from "@/lib/tr/assets";
import { maintenanceDict } from "@/lib/tr/maintenance";
import { twinDict } from "@/lib/tr/twin";
import { reportsDict } from "@/lib/tr/reports";
import { brainDict } from "@/lib/tr/brain";
import { alarmsDict } from "@/lib/tr/alarms";
import { workordersDict } from "@/lib/tr/workorders";

/** Source-string keyed translations. English is the source of truth (and the
 *  fallback). Wrap any hard-coded UI string with `tr("English text")` and it
 *  returns the localized version for the active locale, or the English source
 *  if no translation exists yet. Lets us localize view content incrementally
 *  without threading i18n keys through every component. */
type Tr = Record<"th" | "ja" | "zh", string>;

const DICT: Record<string, Tr> = {
  // —— panel titles ——
  "Live oscilloscope · disturbance detection": { th: "ออสซิลโลสโคปเรียลไทม์ · ตรวจจับความผิดปกติ", ja: "ライブオシロスコープ · 外乱検出", zh: "实时示波器 · 扰动检测" },
  "Three-phase balance": { th: "สมดุลสามเฟส", ja: "三相バランス", zh: "三相平衡" },
  "Harmonic spectrum": { th: "สเปกตรัมฮาร์มอนิก", ja: "高調波スペクトル", zh: "谐波频谱" },
  "Power triangle & correction": { th: "สามเหลี่ยมกำลัง & การแก้ไข", ja: "電力三角形と補正", zh: "功率三角形与校正" },
  "Standards compliance": { th: "การปฏิบัติตามมาต°าน", ja: "規格適合", zh: "标准合规" },
  "ITIC / CBEMA ride-through curve": { th: "เส้นโค้ง ITIC / CBEMA ride-through", ja: "ITIC / CBEMA ライドスルー曲線", zh: "ITIC / CBEMA 穿越曲线" },
  "Sag & swell log · root cause & mitigation": { th: "บันทึกไฟตก/เกิน · สาเหตุ & วิธีแก้", ja: "サグ/スウェル記録 · 原因と対策", zh: "电压暂降/暂升日志 · 根因与缓解" },

  // —— KPI labels ——
  "PQ Score": { th: "คะแนน PQ", ja: "PQスコア", zh: "PQ评分" },
  "Voltage THD": { th: "แรงดัน THD", ja: "電圧THD", zh: "电压THD" },
  "Current THD": { th: "กระแส THD", ja: "電流THD", zh: "电流THD" },
  "Power Factor": { th: "เพาเวอร์แฟกเตอร์", ja: "力率", zh: "功率因数" },
  "Frequency": { th: "ความถี่", ja: "周波数", zh: "频率" },

  // —— chips / misc ——
  "live · incomer": { th: "ขณะนี้ · จุดรับไฟ", ja: "ライブ · 引込", zh: "实时 · 进线" },
  "% of fundamental": { th: "% ของมูลฐาน", ja: "基本波比%", zh: "基波百分比" },
  "last 24h": { th: "24 ชม.ล่าสุด", ja: "直近24時間", zh: "近24小时" },
  "outside envelope": { th: "หลุดกรอบ", ja: "包絡線外", zh: "超出包络" },

  // —— section header ——
  "Voltage disturbance analysis · sag · swell · flicker · transient": { th: "วิเคราะห์การรบกวนแรงดัน · ไฟตก · ไฟเกิน · ไฟกระพริบ · ไฟกระชาก", ja: "電圧外乱分析 · サグ · スウェル · フリッカ · トランジェント", zh: "电压扰动分析 · 暂降 · 暂升 · 闪变 · 瞬变" },

  // —— oscilloscope controls ——
  "Inject": { th: "จำลอง", ja: "注入", zh: "注入" },
  "Sag": { th: "ไฟตก", ja: "サグ", zh: "暂降" },
  "Swell": { th: "ไฟเกิน", ja: "スウェル", zh: "暂升" },
  "Flicker": { th: "ไฟกระพริบ", ja: "フリッカ", zh: "闪变" },
  "Transient": { th: "ไฟกระชาก", ja: "トランジェント", zh: "瞬变" },
  "Freeze": { th: "หยุดภาพ", ja: "静止", zh: "冻结" },
  "Live": { th: "ขณะนี้", ja: "ライブ", zh: "实时" },
  "Thresholds": { th: "เกณฑ์เตือน", ja: "しきい値", zh: "阈值" },
  "Auto-sim": { th: "จำลองอัตโนมัติ", ja: "自動シム", zh: "自动模拟" },
  "Alarms": { th: "การเตือน", ja: "アラーム", zh: "报警" },
  "on": { th: "เปิด", ja: "オン", zh: "开" },
  "off": { th: "ปิด", ja: "オフ", zh: "关" },
  "Enable": { th: "เปิดใช้", ja: "有効化", zh: "启用" },
  "Reset defaults": { th: "รีเซ็ตค่าเริ่มต้น", ja: "既定値に戻す", zh: "重置默认" },
  "Browser notifications": { th: "การแจ้งเตือนเบราว์เซอร์", ja: "ブラウザ通知", zh: "浏览器通知" },

  // —— oscilloscope threshold labels ——
  "Sag alarm below": { th: "เตือนไฟตกต่ำกว่า", ja: "サグ警報 (未満)", zh: "暂降报警低于" },
  "Swell alarm above": { th: "เตือนไฟเกินสูงกว่า", ja: "スウェル警報 (超)", zh: "暂升报警高于" },
  "Flicker Pst above": { th: "เตือน Pst สูงกว่า", ja: "フリッカPst (超)", zh: "闪变Pst高于" },
  "Transient above": { th: "เตือนกระชากสูงกว่า", ja: "トランジェント (超)", zh: "瞬变高于" },

  // —— oscilloscope readout ——
  "Detected now": { th: "ตรวจพบตอนนี้", ja: "現在の検出", zh: "当前检测" },
  "measured RMS": { th: "RMS ที่วัดได้", ja: "実測RMS", zh: "实测RMS" },
  "of nominal": { th: "ของค่าปกติ", ja: "定格比", zh: "额定值" },
  "Detected events": { th: "เหตุการณ์ที่ตรวจพบ", ja: "検出イベント", zh: "检测到的事件" },
  "click to replay · pin to locate": { th: "คลิกเพื่อเล่นซ้ำ · ปักหมุดเพื่อค้นหา", ja: "クリックで再生 · ピンで位置特定", zh: "点击回放 · 图钉定位" },
  "Monitoring… no disturbances detected.": { th: "กำลังเฝ้าดู… ยังไม่พบการรบกวน", ja: "監視中… 外乱は検出されていません", zh: "监测中… 未检测到扰动" },
  "Normal": { th: "ปกติ", ja: "正常", zh: "正常" },
  "all phases nominal": { th: "ทุกเฟสปกติ", ja: "全相正常", zh: "各相正常" },

  // —— three-phase ——
  "Voltage": { th: "แรงดัน", ja: "電圧", zh: "电压" },
  "Current": { th: "กระแส", ja: "電流", zh: "电流" },
  "phasors · 120° apart": { th: "เฟสเซอร์ · ห่าง 120°", ja: "フェーザ · 120°間隔", zh: "相量 · 相隔120°" },
  "Voltage unbalance": { th: "ความไม่สมดุลแรงดัน", ja: "電圧不平衡", zh: "电压不平衡" },
  "Current unbalance": { th: "ความไม่สมดุลกระแส", ja: "電流不平衡", zh: "电流不平衡" },
  "watch NEMA < 10%": { th: "เฝ้าระวัง NEMA < 10%", ja: "NEMA < 10% 監視", zh: "关注 NEMA < 10%" },
  "Symmetrical components": { th: "องค์ประกอบสมมาตร", ja: "対称分", zh: "对称分量" },
  "Rotation": { th: "ลำดับเฟส", ja: "相順", zh: "相序" },
  "Positive": { th: "ลำดับบวก", ja: "正相分", zh: "正序" },
  "Negative": { th: "ลำดับลบ", ja: "逆相分", zh: "负序" },
  "Zero": { th: "ลำดับศูนย์", ja: "零相分", zh: "零序" },
  "Within NEMA — no derating": { th: "อยู่ในเกณฑ์ NEMA — ไม่ต้อง derate Motor", ja: "NEMA範囲内 — ディレーティング不要", zh: "符合NEMA — 无需降容" },
  "neutral current": { th: "กระแสนิวทรัล", ja: "中性線電流", zh: "中性线电流" },

  // —— harmonic ——
  "over limit": { th: "เกินลิมิต", ja: "上限超過", zh: "超限" },
  "harmonic order": { th: "อันดับฮาร์มอนิก", ja: "高調波次数", zh: "谐波次数" },
  "Signature:": { th: "ลายเซ็น:", ja: "シグネチャ:", zh: "特征：" },
  "6-pulse VFD drives (5th·7th)": { th: "ไดรฟ์ VFD 6 พัลส์ (ฮาร์มอนิก 5·7)", ja: "6パルスVFDドライブ (第5·7次)", zh: "6脉冲VFD驱动 (5·7次)" },
  "single-phase electronics on neutral (3rd)": { th: "อุปกรณ์เฟสเดียวบนสายนิวทรัล (ฮาร์มอนิก 3)", ja: "中性線上の単相電子機器 (第3次)", zh: "中性线单相电子设备 (3次)" },
  "linear load — low distortion": { th: "โหลดเชิงเส้น — ความเพี้ยนต่ำ", ja: "線形負荷 — 低歪み", zh: "线性负载 — 低失真" },
  "over individual limit": { th: "เกินลิมิตรายตัว", ja: "個別上限超過", zh: "超过单次限值" },
  "all orders within individual limits.": { th: "ทุกอันดับอยู่ในลิมิตรายตัว", ja: "全次数が個別上限内", zh: "所有次数均在单次限值内" },
  "Resonance risk:": { th: "เสี่ยงเรโซแนนซ์:", ja: "共振リスク:", zh: "谐振风险：" },
  "PF bank near the dominant 5th — add a 7% detuned reactor (~3.8th) so it can't resonate and fail.": { th: "คาปาซิเตอร์แก้ PF อยู่ใกล้ฮาร์มอนิกที่ 5 — ใส่ detuned reactor 7% (~3.8) กันเรโซแนนซ์และระเบิด", ja: "PFバンクが第5次高調波付近 — 7%リアクトル(~3.8次)を追加し共振・故障を防止", zh: "PF电容组靠近主导5次谐波 — 加装7%电抗器(~3.8次)防止谐振与损坏" },
  "Active harmonic filter (AHF) at MDB": { th: "Active Harmonic Filter (AHF) ที่ MDB", ja: "アクティブ高調波フィルタ(AHF)をMDBに", zh: "在MDB加装有源滤波器(AHF)" },
  "Passive 5th/7th tuned filter": { th: "ตัวกรองพาสซีฟจูน 5/7", ja: "第5/7次パッシブ同調フィルタ", zh: "5/7次无源调谐滤波器" },
  "K-rated transformer / oversized neutral": { th: "หม้อแปลง K-rated / สายนิวทรัลใหญ่ขึ้น", ja: "K定格変圧器 / 中性線増径", zh: "K级变压器 / 加大中性线" },
  "recovers ~": { th: "กู้คืน ~", ja: "回収 約", zh: "回收约" },
  "harmonic losses": { th: "การสูญเสียจากฮาร์มอนิก", ja: "高調波損失", zh: "谐波损耗" },
  "IEEE-519 compliance": { th: "ผ่าน IEEE-519", ja: "IEEE-519適合", zh: "符合IEEE-519" },

  // —— power triangle ——
  "Active power": { th: "กำลังจริง", ja: "有効電力", zh: "有功功率" },
  "Reactive power": { th: "กำลังรีแอกทีฟ", ja: "無効電力", zh: "无功功率" },
  "Apparent power": { th: "กำลังปรากฏ", ja: "皮相電力", zh: "视在功率" },
  "Power factor": { th: "เพาเวอร์แฟกเตอร์", ja: "力率", zh: "功率因数" },
  "Capacitor bank": { th: "ชุดคาปาซิเตอร์", ja: "コンデンサバンク", zh: "电容器组" },
  "Add": { th: "เพิ่ม", ja: "追加", zh: "增加" },
  "save": { th: "ประหยัด", ja: "節約", zh: "节省" },
  "Plan": { th: "วางแผน", ja: "計画", zh: "规划" },
  "Ask AI": { th: "ถาม AI", ja: "AIに質問", zh: "问AI" },

  // —— compliance ——
  "All parameters within limits · nearest to limit: Current THD (80%)": { th: "ทุกพารามิเตอร์อยู่ในลิมิต · ใกล้ลิมิตสุด: กระแส THD (80%)", ja: "全パラメータが上限内 · 最も近い: 電流THD (80%)", zh: "所有参数在限值内 · 最接近限值：电流THD (80%)" },
  "Voltage unbalance ": { th: "ความไม่สมดุลแรงดัน", ja: "電圧不平衡", zh: "电压不平衡" },
  "Flicker · Pst": { th: "ไฟกระพริบ · Pst", ja: "フリッカ · Pst", zh: "闪变 · Pst" },
  "Frequency dev.": { th: "ค่าเบี่ยงเบนความถี่", ja: "周波数偏差", zh: "频率偏差" },

  // —— ITIC ——
  "How to read:": { th: "วิธีอ่าน:", ja: "見方:", zh: "如何解读：" },
  "each dot is a voltage event (depth × duration). Inside the green band = equipment rides through. Outside (red ring) = likely to trip PLCs / contactors.": { th: "แต่ละจุดคือเหตุการณ์แรงดัน (ลึก × นาน) · อยู่ในแถบเขียว = อุปกรณ์ทนได้ · หลุดกรอบ (วงแดง) = เสี่ยงทริป PLC/คอนแทกเตอร์", ja: "各点は電圧イベント(深さ×時間)。緑帯内=機器は耐える。外(赤環)=PLC/接触器が停止する恐れ。", zh: "每个点为电压事件(深度×时长)。绿带内=设备可穿越。带外(红圈)=可能使PLC/接触器跳脱。" },
  "OVERVOLTAGE": { th: "แรงดันเกิน", ja: "過電圧", zh: "过电压" },
  "SAFE ZONE": { th: "โซนปลอดภัย", ja: "安全域", zh: "安全区" },
  "UNDERVOLTAGE · DROP-OUT": { th: "แรงดันตก · หลุด", ja: "低電圧 · 脱落", zh: "欠压 · 脱扣" },
  "100% nominal": { th: "ปกติ 100%", ja: "定格100%", zh: "额定100%" },
  "VOLTAGE (% NOMINAL)": { th: "แรงดัน (% ปกติ)", ja: "電圧 (% 定格)", zh: "电压 (% 额定)" },
  "EVENT DURATION (LOG SCALE)": { th: "ระยะเวลาเหตุการณ์ (log)", ja: "イベント継続時間 (対数)", zh: "事件持续时间 (对数)" },
  "Interruption": { th: "ไฟดับชั่วขณะ", ja: "瞬断", zh: "中断" },
  "outside tolerance → equipment at risk": { th: "หลุดพิสัย → อุปกรณ์เสี่ยง", ja: "許容外 → 機器リスク", zh: "超出容差 → 设备风险" },
  "Points below the red curve (sag) or above the amber curve (swell) fall outside ride-through tolerance — the L2 motor-start sag (76%, 120 ms) and the 80 ms interruption risk PLC/contactor drop-out. See the AI analysis below for the root cause and fixes.": { th: "จุดที่ต่ำกว่าเส้นแดง (ไฟตก) หรือสูงกว่าเส้นเหลือง (ไฟเกิน) หลุดพิสัยที่อุปกรณ์ทนได้ — ไฟตกตอนสตาร์ท Motor L2 (76%, 120 ms) และไฟดับ 80 ms เสี่ยงทำ PLC/คอนแทกเตอร์หลุด ดูการวิเคราะห์ AI ด้านล่างสำหรับต้นตอและวิธีแก้", ja: "赤曲線より下(サグ)または黄曲線より上(スウェル)の点はライドスルー許容外 — L2始動サグ(76%, 120ms)と80ms瞬断はPLC/接触器の脱落リスク。下のAI分析で原因と対策を参照。", zh: "低于红线(暂降)或高于黄线(暂升)的点超出穿越容差 — L2电机启动暂降(76%, 120ms)和80ms中断有PLC/接触器脱扣风险。见下方AI分析了解原因与对策。" },

  // —— disturbance cards ——
  "Voltage Sags": { th: "ไฟตก", ja: "電圧サグ", zh: "电压暂降" },
  "Voltage Swells": { th: "ไฟเกิน", ja: "電圧スウェル", zh: "电压暂升" },
  "Transients": { th: "ไฟกระชาก", ja: "トランジェント", zh: "瞬变" },
  "Soft-starter / VFD on Chiller B": { th: "ซอฟต์สตาร์ท/VFD ที่ Chiller B", ja: "Chiller Bにソフトスタータ/VFD", zh: "在Chiller B加软启动/变频" },
  "Detuned reactor on cap bank": { th: "ใส่ detuned reactor ที่ชุดคาปาซิเตอร์", ja: "コンデンサに直列リアクトル", zh: "电容组加串联电抗器" },
  "SVC / STATCOM on welding bay": { th: "SVC/STATCOM ที่โซนงานเชื่อม", ja: "溶接エリアにSVC/STATCOM", zh: "焊接区加SVC/STATCOM" },
  "Type-2 SPD at MDB + RC snubbers on contactors": { th: "SPD Type-2 ที่ MDB + RC snubber ที่คอนแทกเตอร์", ja: "MDBにType-2 SPD + 接触器にRCスナバ", zh: "MDB加二类SPD + 接触器加RC吸收" },

  // —— sag/swell table ——
  "Time": { th: "เวลา", ja: "時刻", zh: "时间" },
  "Type": { th: "ชนิด", ja: "種別", zh: "类型" },
  "Phase": { th: "เฟส", ja: "相", zh: "相" },
  "Duration": { th: "ระยะเวลา", ja: "継続時間", zh: "持续时间" },
  "Likely cause": { th: "สาเหตุที่น่าจะเป็น", ja: "推定原因", zh: "可能原因" },
  "Recommended fix": { th: "วิธีแก้ที่แนะนำ", ja: "推奨対策", zh: "建议对策" },
  "Within": { th: "ผ่าน", ja: "範囲内", zh: "合格" },
  "Violation": { th: "ละเมิด", ja: "逸脱", zh: "越限" },
  "Interrupt": { th: "ไฟดับ", ja: "瞬断", zh: "中断" },
  "Chiller B DOL motor start (inrush 6×)": { th: "สตาร์ท Motor Chiller B แบบ DOL (กระแสพุ่ง 6×)", ja: "Chiller B DOL始動 (突入6×)", zh: "Chiller B 直接启动 (涌流6×)" },
  "Capacitor bank switching overshoot": { th: "โอเวอร์ชูตจากการสับคาปาซิเตอร์", ja: "コンデンサ投入のオーバーシュート", zh: "电容器投切过冲" },
  "Upstream utility fault + auto-reclose": { th: "ฟอลต์ฝั่งการไฟฟ้า + auto-reclose", ja: "上位系統事故 + 自動再閉路", zh: "上游电网故障 + 自动重合闸" },
  "Incomer feeder breaker trip": { th: "เบรกเกอร์สายเมนทริป", ja: "引込フィーダ遮断器トリップ", zh: "进线馈线断路器跳闸" },
  "Large load rejection (press line stop)": { th: "ปลดโหลดก้อนใหญ่ (ไลน์ Press หยุด)", ja: "大負荷遮断 (プレス停止)", zh: "大负荷甩负荷 (冲压线停)" },
  "Fit soft-starter / VFD on Chiller B": { th: "ติดซอฟต์สตาร์ท/VFD ที่ Chiller B", ja: "Chiller Bにソフトスタータ/VFD設置", zh: "为Chiller B安装软启动/变频" },
  "Add detuned reactor / pre-insertion resistor": { th: "ใส่ detuned reactor / pre-insertion resistor", ja: "直列リアクトル/投入抵抗を追加", zh: "加串联电抗器/投入电阻" },
  "Ride-through: DVR or UPS on critical PLCs": { th: "Ride-through: DVR หรือ UPS ที่ PLC สำคัญ", ja: "ライドスルー: 重要PLCにDVR/UPS", zh: "穿越：关键PLC加DVR或UPS" },
  "Auto-transfer to backup feeder / UPS": { th: "สลับไปสายสำรอง / UPS อัตโนมัติ", ja: "予備フィーダ/UPSへ自動切替", zh: "自动切换到备用馈线/UPS" },
  "Review load-shedding sequence + AVR": { th: "ทบทวนลำดับปลดโหลด + AVR", ja: "負荷遮断シーケンス + AVR見直し", zh: "检查甩负荷顺序 + AVR" },
  "Motor start / sudden load step": { th: "สตาร์ท Motor / โหลดกระชากทันที", ja: "モータ始動 / 急な負荷ステップ", zh: "电机启动 / 突加负荷" },
  "Capacitor switching / load rejection": { th: "สับคาปาซิเตอร์ / ปลดโหลด", ja: "コンデンサ投入 / 負荷遮断", zh: "电容投切 / 甩负荷" },
  "Soft-starter / VFD · UPS-DVR ride-through": { th: "ซอฟต์สตาร์ท/VFD · ride-through ด้วย UPS/DVR", ja: "ソフトスタータ/VFD · UPS/DVRライドスルー", zh: "软启动/变频 · UPS/DVR穿越" },
  "Detuned reactor / AVR trim": { th: "detuned reactor / ปรับ AVR", ja: "直列リアクトル / AVR調整", zh: "串联电抗器 / AVR调整" },

  // —— AI insight (Power Quality) ——
  "PQ score": { th: "คะแนน PQ", ja: "PQスコア", zh: "PQ评分" },
  "power quality is healthy.": { th: "คุณภาพไฟฟ้าอยู่ในเกณฑ์ดี", ja: "電力品質は良好です。", zh: "电能质量良好。" },
  "A": { th: "การใส่", ja: "", zh: "加装" },
  "kVAR bank lifts PF to 0.99 and cuts": { th: "kVAR จะยก PF เป็น 0.99 และลดได้", ja: "kVARバンクで力率0.99へ改善し削減", zh: "kVAR电容组将力率提升至0.99并节省" },
  "in demand charges. Current THD is nearing the IEEE-519 limit — worth watching.": { th: "ต่อค่าดีมานด์/ปี · กระแส THD กำลังเข้าใกล้ลิมิต IEEE-519 — ควรเฝ้าระวัง", ja: "/年 のデマンド料金。電流THDがIEEE-519上限に接近 — 要監視。", zh: "/年 需量电费。电流THD接近IEEE-519限值 — 需关注。" },
};

// merge per-module dictionaries (each module owns its own file → no edit conflicts)
Object.assign(DICT, energyDict, operationsDict, assetsDict, maintenanceDict, twinDict, reportsDict, brainDict, alarmsDict, workordersDict);

export function translate(en: string, locale: Locale): string {
  if (locale === "en") return en;
  return DICT[en]?.[locale] ?? en;
}

/** Hook: returns a `tr()` bound to the active locale. Using it makes the
 *  component re-render on locale change (it consumes the i18n context). */
export function useTr() {
  const { locale } = useI18n();
  return (en: string) => translate(en, locale);
}
