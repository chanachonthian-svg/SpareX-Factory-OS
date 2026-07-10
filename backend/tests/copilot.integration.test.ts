import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { pool, closePool } from "../src/db/pool.js";
import { seed } from "../src/db/seed.js";
import { getEnergyCost } from "../src/tools/factoryTools.js";
import { runCopilotAgent } from "../src/llm/orchestrator.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";

describe.skipIf(!runIntegration)("copilot integration with seeded Timescale data", () => {
  beforeAll(async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.ANTHROPIC_MODEL = "claude-sonnet-5";
    await seed();
  }, 120000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await closePool();
  });

  it("answers 'ต้นทุนพลังงานวันนี้เท่าไหร่' using real seeded data through tool use", async () => {
    const expected = await getEnergyCost(pool, { period: "today" });
    const expectedCost = expected.data.total_cost_thb;

    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}"));
      const last = body.messages?.at(-1);
      const hasToolResult = last?.content?.some((block: { type: string }) => block.type === "tool_result");

      if (!hasToolResult) {
        return new Response(JSON.stringify({
          id: "msg_tool",
          type: "message",
          role: "assistant",
          stop_reason: "tool_use",
          content: [{
            type: "tool_use",
            id: "toolu_energy_today",
            name: "get_energy_cost",
            input: { period: "today" },
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      const toolResult = JSON.parse(last.content.find((block: { type: string }) => block.type === "tool_result").content);
      return new Response(JSON.stringify({
        id: "msg_final",
        type: "message",
        role: "assistant",
        stop_reason: "end_turn",
        content: [{
          type: "text",
          text: `ต้นทุนพลังงานวันนี้คือ ${toolResult.data.total_cost_thb} บาท จากการใช้ไฟ ${toolResult.data.total_kwh} kWh ข้อมูล ณ ${toolResult.data_as_of}`,
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));

    const events: Array<{ event: string; data: unknown }> = [];
    await runCopilotAgent(pool, `test-${Date.now()}`, "ต้นทุนพลังงานวันนี้เท่าไหร่", (event, data) => {
      events.push({ event, data });
    });

    const text = events
      .filter((event) => event.event === "delta")
      .map((event) => (event.data as { text: string }).text)
      .join("");

    expect(text).toContain(String(expectedCost));
    expect(text).toContain("ข้อมูล ณ");
  });
});
