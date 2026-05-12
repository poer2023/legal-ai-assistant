export type OpenRouterChatOptions = {
  mode: string;
  thinkingMode: string;
  searchModes: string[];
  templateName?: string;
  selectedSkills?: Array<{
    id: string;
    name: string;
    description: string;
    files: Array<{
      path: string;
      content: string;
    }>;
  }>;
};

export type OpenRouterChatResult = {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
};

type OpenRouterStreamEvent = {
  content?: string;
  model?: string;
  error?: string;
};

type StreamCallbacks = {
  onToken?: (token: string, fullContent: string) => void;
  onMeta?: (model: string) => void;
};

const normalizeOpenRouterError = (message: string) => {
  if (/provider returned error/i.test(message)) {
    return 'DeepSeek 上游模型返回异常，请稍后重试或切换模型';
  }

  return message;
};

const readErrorMessage = (data: unknown, fallback: string) => {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return normalizeOpenRouterError(error);
  }

  return normalizeOpenRouterError(fallback);
};

const readStreamPayload = (frame: string): { event: string; data: OpenRouterStreamEvent | null } => {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (!dataLines.length) {
    return { event, data: null };
  }

  return {
    event,
    data: JSON.parse(dataLines.join('\n')) as OpenRouterStreamEvent,
  };
};

const createRequestTimeout = (controller: AbortController, timeoutMs = 120_000) => {
  let timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  return {
    refresh() {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    },
    clear() {
      window.clearTimeout(timeout);
    },
  };
};

export const streamOpenRouterMessage = async (
  prompt: string,
  options: OpenRouterChatOptions,
  callbacks: StreamCallbacks = {},
): Promise<OpenRouterChatResult> => {
  const controller = new AbortController();
  const timeout = createRequestTimeout(controller);

  let response: Response;

  try {
    response = await fetch('/api/openrouter-chat', {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        prompt,
        options,
        stream: true,
      }),
    });
  } catch (error) {
    timeout.clear();

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('DeepSeek 请求超时，请稍后重试');
    }

    throw error;
  }

  if (!response.ok) {
    timeout.clear();
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(readErrorMessage(data, `DeepSeek 请求失败 (${response.status})`));
  }

  if (!response.body) {
    timeout.clear();
    throw new Error('DeepSeek 未返回可读取的流');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let model = '';

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      timeout.refresh();
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (frame) {
          const payload = readStreamPayload(frame);

          if (payload.event === 'error') {
            throw new Error(normalizeOpenRouterError(payload.data?.error || 'DeepSeek 调用失败'));
          }

          if (payload.event === 'meta' && payload.data?.model) {
            model = payload.data.model;
            callbacks.onMeta?.(model);
          }

          if (payload.event === 'content' && payload.data?.content) {
            content += payload.data.content;
            callbacks.onToken?.(payload.data.content, content);
          }
        }

        boundary = buffer.indexOf('\n\n');
      }
    }

    buffer += decoder.decode().replace(/\r\n/g, '\n');

    if (buffer.trim()) {
      const payload = readStreamPayload(buffer.trim());

      if (payload.event === 'error') {
        throw new Error(normalizeOpenRouterError(payload.data?.error || 'DeepSeek 调用失败'));
      }

      if (payload.event === 'meta' && payload.data?.model) {
        model = payload.data.model;
        callbacks.onMeta?.(model);
      }

      if (payload.event === 'content' && payload.data?.content) {
        content += payload.data.content;
        callbacks.onToken?.(payload.data.content, content);
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('DeepSeek 请求超时，请稍后重试');
    }

    throw error;
  } finally {
    timeout.clear();
  }

  if (!content.trim()) {
    throw new Error('DeepSeek 返回为空');
  }

  return { content, model };
};

export const sendOpenRouterMessage = async (
  prompt: string,
  options: OpenRouterChatOptions,
): Promise<OpenRouterChatResult> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);

  let response: Response;

  try {
    response = await fetch('/api/openrouter-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        prompt,
        options,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('DeepSeek 请求超时，请稍后重试');
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null) as OpenRouterChatResult | { error?: string } | null;

  if (!response.ok) {
    throw new Error(readErrorMessage(data, `DeepSeek 请求失败 (${response.status})`));
  }

  if (!data || !('content' in data) || !data.content?.trim()) {
    throw new Error('DeepSeek 返回为空');
  }

  return data;
};
