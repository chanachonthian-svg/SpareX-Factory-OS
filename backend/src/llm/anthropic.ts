import { config } from "../config.js";
import type { FactoryToolName } from "../tools/types.js";

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: FactoryToolName; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: AnthropicContentBlock[];
};

export type AnthropicResponse = {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "max_tokens" | "tool_use" | "stop_sequence" | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

export const SYSTEM_PROMPT = [
  "คุณคือ SpareX Factory OS AI Factory Copilot สำหรับโรงงานไทย",
  "",
  "กฎที่ต้องทำตามเสมอ:",
  "- ตอบเป็นภาษาไทย",
  "- ทุกตัวเลขเกี่ยวกับต้นทุน พลังงาน หรือสถานะเครื่องจักร ต้องมาจาก tool call เท่านั้น และต้องอ้างเวลาข้อมูล เช่น \"ข้อมูล ณ 8 ก.ค. 2026 14:00\"",
  "- ถ้า tool ไม่มีข้อมูล ให้บอกว่าไม่มีข้อมูล ห้ามประมาณการหรือแต่งตัวเลขเอง",
  "- คำแนะนำต้องอ้างอิงข้อมูลจริงจาก tool เช่น \"Compressor #3 ใช้ไฟ 22% ของทั้งหมด\"",
  "- ปฏิเสธคำถามที่อยู่นอกขอบเขตการปฏิบัติการโรงงาน",
  "",
  "อย่าใช้ตัวเลขจากความจำหรือจากข้อความผู้ใช้เป็นข้อเท็จจริง จนกว่าจะตรวจสอบด้วย tool แล้วเท่านั้น",
].join("\n");

export const factoryToolDefinitions = [
  {
    name: "get_energy_cost",
    description: "Get total energy consumption and electricity cost for today, last 7 days, or last 30 days. Use this before reporting any energy or cost number.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        period: { type: "string", enum: ["today", "7d", "30d"] },
      },
      required: ["period"],
    },
  },
  {
    name: "get_top_energy_consumers",
    description: "Rank machines by kWh share over the last 30 days. Use this before recommending energy saving actions or citing machine share.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20, default: 5 },
      },
      required: ["limit"],
    },
  },
  {
    name: "get_machine_status",
    description: "Get machine status, runtime hours, and latest maintenance log for a machine_id.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        machine_id: { type: "string", minLength: 1, maxLength: 64 },
      },
      required: ["machine_id"],
    },
  },
  {
    name: "get_spare_parts_alerts",
    description: "Get spare parts whose stock is below minimum stock.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
      required: [],
    },
  },
] as const;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function anthropicMessagesCreate(messages: AnthropicMessage[], maxTokens = 4096): Promise<AnthropicResponse> {
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for copilot chat");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": config.anthropicApiKey,
        },
        body: JSON.stringify({
          model: config.anthropicModel,
          max_tokens: Math.max(4096, maxTokens),
          system: SYSTEM_PROMPT,
          tools: factoryToolDefinitions,
          messages,
        }),
      });

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Anthropic retryable status ${response.status}: ${await response.text()}`);
        await sleep(500 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        throw new Error(`Anthropic status ${response.status}: ${await response.text()}`);
      }
      return (await response.json()) as AnthropicResponse;
    } catch (error) {
      lastError = error;
      await sleep(500 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Anthropic request failed");
}
