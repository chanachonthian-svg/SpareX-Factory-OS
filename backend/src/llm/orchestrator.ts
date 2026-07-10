import type { Queryable } from "../db/pool.js";
import { executeFactoryTool } from "../tools/factoryTools.js";
import type { FactoryToolName } from "../tools/types.js";
import { anthropicMessagesCreate, type AnthropicContentBlock, type AnthropicMessage } from "./anthropic.js";
import { loadSessionMessages, saveSessionMessage } from "./sessions.js";

type EmitEvent = (event: string, data: unknown) => void;

function textBlocks(content: AnthropicContentBlock[]) {
  return content.filter((block): block is { type: "text"; text: string } => block.type === "text");
}

function toolUseBlocks(content: AnthropicContentBlock[]) {
  return content.filter((block): block is { type: "tool_use"; id: string; name: FactoryToolName; input: unknown } => block.type === "tool_use");
}

async function withRetries<T>(fn: () => Promise<T>, label: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

export async function runCopilotAgent(db: Queryable, sessionId: string, message: string, emit: EmitEvent) {
  const userContent: AnthropicContentBlock[] = [{ type: "text", text: message }];
  await saveSessionMessage(db, sessionId, "user", userContent);

  const messages: AnthropicMessage[] = [
    ...(await loadSessionMessages(db, sessionId, 30)),
  ];

  let usedToolThisTurn = false;
  let loops = 0;
  while (loops < 12) {
    loops += 1;
    const response = await anthropicMessagesCreate(messages, 4096);
    const assistantContent = response.content;
    messages.push({ role: "assistant", content: assistantContent });
    await saveSessionMessage(db, sessionId, "assistant", assistantContent);

    const tools = toolUseBlocks(assistantContent);
    if (tools.length > 0) {
      const toolResults: AnthropicContentBlock[] = [];
      for (const tool of tools) {
        emit("tool_start", { name: tool.name, input: tool.input });
        try {
          const result = await withRetries(() => executeFactoryTool(db, tool.name, tool.input), tool.name);
          usedToolThisTurn = true;
          emit("tool_result", { name: tool.name, result });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Tool execution failed";
          emit("tool_error", { name: tool.name, error: message });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: JSON.stringify({ error: message, data_as_of: new Date().toISOString(), data: null }),
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      await saveSessionMessage(db, sessionId, "user", toolResults);
      continue;
    }

    const text = textBlocks(assistantContent).map((block) => block.text).join("");
    if (text.trim()) {
      const hasNumericClaim = /[\d๐-๙]/u.test(text);
      if (hasNumericClaim && !usedToolThisTurn) {
        emit("delta", {
          text: "ขอโทษครับ ผมไม่สามารถรายงานตัวเลขโดยไม่เรี·ใช้ข้อมูลจากระบบโรงงานได้ กรุณาถามใหม่ในขอบเขตการปฏิบัติการโรงงาน แล้วผมจะตรวจสอบผ่านเครื่องมือก่อนตอบครับ",
        });
        emit("done", { session_id: sessionId, stop_reason: "guardrail_no_tool_for_numbers" });
        return;
      }
      emit("delta", { text });
    }

    if (response.stop_reason === "max_tokens") {
      const continueContent: AnthropicContentBlock[] = [{
        type: "text",
        text: "คำตอบก่อนหน้าถูกจำกัดความยาว กรุณาตอบต่อจากจุดเดิมโดยไม่เริ่มใหม่ และยังต้องทำตามกฎ tool/data_as_of ทุกข้อ",
      }];
      messages.push({ role: "user", content: continueContent });
      await saveSessionMessage(db, sessionId, "user", continueContent);
      continue;
    }

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence" || response.stop_reason === null) {
      emit("done", { session_id: sessionId, stop_reason: response.stop_reason || "end_turn" });
      return;
    }
  }

  throw new Error("Copilot agent exceeded maximum tool loop iterations");
}
