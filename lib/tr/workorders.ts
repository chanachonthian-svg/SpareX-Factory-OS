import type { Locale } from "@/lib/dict";

type Tr = Record<Exclude<Locale, "en">, string>;

/** Work Orders module strings. Merged into the global tr() dictionary. */
export const workordersDict: Record<string, Tr> = {
  "Work orders from approved findings": { th: "ใบสั่งงานจากผลตรวจที่อนุมัติ", ja: "承認済み所見からの作業指示", zh: "由已批准发现生成的工单" },
  "Work orders from findings": { th: "ใบสั่งงานจากผลตรวจ", ja: "所見からの作業指示", zh: "来自发现的工单" },
  "Manage all": { th: "จัดการทั้งหมด", ja: "すべて管理", zh: "管理全部" },
  "List": { th: "รายการ", ja: "リスト", zh: "列表" },
  "Calendar": { th: "ปฏิทิน", ja: "カレンダー", zh: "日历" },
  "Today": { th: "วันนี้", ja: "今日", zh: "今天" },
  "To-Do List": { th: "รายการที่ต้องทำ", ja: "やることリスト", zh: "待办清单" },
  "All clear · nothing to do": { th: "ไม่มีงานค้าง", ja: "対応待ちはありません", zh: "没有待办事项" },
  "Open orders": { th: "งานที่กำลังทำ", ja: "進行中の指示", zh: "进行中工单" },
  "Capex committed": { th: "งบลงทุนที่ผูกไว้", ja: "確定した設備投資", zh: "已承诺投资" },
  "Saving secured": { th: "เงินประหยัดที่ยืนยันแล้ว", ja: "確定した削減額", zh: "已确认节省" },
  "Overdue": { th: "เกินกำหนด", ja: "期限超過", zh: "逾期" },
  "Open": { th: "กำลังทำ", ja: "進行中", zh: "进行中" },
  "Completed": { th: "เสร็จแล้ว", ja: "完了", zh: "已完成" },
  "No work orders yet": { th: "ยังไม่มีใบสั่งงาน", ja: "作業指示はまだありません", zh: "暂无工单" },
  "Approve a finding to raise its work order.": { th: "กดอนุมัติในการ์ดผลตรวจเพื่อออกใบสั่งงาน", ja: "所見を承認すると作業指示が発行されます。", zh: "批准发现即可生成工单。" },
  "Stage": { th: "ขั้นที่", ja: "段階", zh: "阶段" },
  "Saving": { th: "ประหยัด", ja: "削減", zh: "节省" },
  "Due": { th: "กำหนดเสร็จ", ja: "期限", zh: "截止" },
  "overdue": { th: "เกินกำหนด", ja: "期限超過", zh: "逾期" },
  "parts": { th: "รายการอะไหล่", ja: "部品", zh: "个部件" },
  "Continue": { th: "ดำเนินการต่อ", ja: "次へ進める", zh: "推进到" },
  // finding-card actions
  "Approve & raise WO": { th: "อนุมัติ & ออกใบสั่งงาน", ja: "承認して作業指示を発行", zh: "批准并生成工单" },
  "WO raised": { th: "ออกใบสั่งงานแล้ว", ja: "作業指示を発行済み", zh: "已生成工单" },
  "View Work Order": { th: "ดูใบสั่งงาน", ja: "作業指示を見る", zh: "查看工单" },
};
