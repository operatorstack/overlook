export type AnthropicMessageResult =
  | { ok: true; text: string }
  | { ok: false; error: string; httpStatus?: number };

type MessagesRequest = {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: "user"; content: string }[];
};

function extractTextFromContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  const parts: string[] = [];
  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string"
    ) {
      parts.push(block.text);
    }
  }
  return parts.join("");
}

export async function completeAnthropicUserMessage(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<AnthropicMessageResult> {
  const url = `${input.baseUrl.replace(/\/$/, "")}/v1/messages`;
  const body: MessagesRequest = {
    model: input.model,
    max_tokens: input.maxTokens,
    system: input.system,
    messages: [{ role: "user", content: input.user }],
  };
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Anthropic request failed: ${msg}` };
  }
  const rawText = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      error: `Anthropic returned non-JSON (HTTP ${String(res.status)})`,
      httpStatus: res.status,
    };
  }
  if (!res.ok) {
    let apiMsg = rawText.slice(0, 500);
    if (typeof data === "object" && data !== null && "error" in data) {
      const errWrap = data.error;
      if (typeof errWrap === "object" && errWrap !== null && "message" in errWrap) {
        const msg = errWrap.message;
        if (typeof msg === "string") {
          apiMsg = msg;
        }
      }
    }
    return {
      ok: false,
      error: `Anthropic HTTP ${String(res.status)}: ${apiMsg}`,
      httpStatus: res.status,
    };
  }
  if (typeof data !== "object" || data === null || !("content" in data)) {
    return {
      ok: false,
      error: "Anthropic response missing content",
      httpStatus: res.status,
    };
  }
  const text = extractTextFromContent(data.content);
  if (text.length === 0) {
    return {
      ok: false,
      error: "Anthropic response contained no text content blocks",
      httpStatus: res.status,
    };
  }
  return { ok: true, text };
}
