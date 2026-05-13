export type DeepSeekChatOptions = {
  mode: string;
  thinkingMode: string;
  searchModes: string[];
  purpose?: 'chat' | 'conversation-title';
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

export type DeepSeekChatResult = {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
};

type DeepSeekStreamEvent = {
  content?: string;
  model?: string;
  error?: string;
};

type StreamCallbacks = {
  onToken?: (token: string, fullContent: string) => void;
  onMeta?: (model: string) => void;
};

const normalizeDeepSeekError = (message: string) => {
  if (/provider returned error/i.test(message)) {
    return 'DeepSeek 上游模型返回异常，请稍后重试或切换模型';
  }

  return message;
};

const readErrorMessage = (data: unknown, fallback: string) => {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return normalizeDeepSeekError(error);
  }

  return normalizeDeepSeekError(fallback);
};

const normalizeConversationTitle = (value: string) => {
  const title = value
    .split('\n')[0]
    ?.replace(/^#+\s*/, '')
    .replace(/^(标题|会话标题|历史标题)\s*[:：]\s*/, '')
    .replace(/[《》“”"'`]/g, '')
    .replace(/[。.!！?？；;，,、]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

  if (!title || title === '新会话') return '';
  return title.length > 18 ? title.slice(0, 18) : title;
};

const readStreamPayload = (frame: string): { event: string; data: DeepSeekStreamEvent | null } => {
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
    data: JSON.parse(dataLines.join('\n')) as DeepSeekStreamEvent,
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

export const streamDeepSeekMessage = async (
  prompt: string,
  options: DeepSeekChatOptions,
  callbacks: StreamCallbacks = {},
): Promise<DeepSeekChatResult> => {
  const controller = new AbortController();
  const timeout = createRequestTimeout(controller);

  let response: Response;

  try {
    response = await fetch('/api/deepseek-chat', {
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
            throw new Error(normalizeDeepSeekError(payload.data?.error || 'DeepSeek 调用失败'));
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
        throw new Error(normalizeDeepSeekError(payload.data?.error || 'DeepSeek 调用失败'));
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

export const sendDeepSeekMessage = async (
  prompt: string,
  options: DeepSeekChatOptions,
): Promise<DeepSeekChatResult> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);

  let response: Response;

  try {
    response = await fetch('/api/deepseek-chat', {
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

  const data = await response.json().catch(() => null) as DeepSeekChatResult | { error?: string } | null;

  if (!response.ok) {
    throw new Error(readErrorMessage(data, `DeepSeek 请求失败 (${response.status})`));
  }

  if (!data || !('content' in data) || !data.content?.trim()) {
    throw new Error('DeepSeek 返回为空');
  }

  return data;
};

export const generateDeepSeekConversationTitle = async (
  prompt: string,
  answer: string,
) => {
  const compactPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 700);
  const compactAnswer = answer.replace(/\s+/g, ' ').trim().slice(0, 900);
  const titlePrompt = [
    '请为下面这段法律 AI 会话生成一个最适合放在历史会话列表里的中文标题。',
    '要求：只输出标题本身；不要解释；不要加引号；不要使用“新会话”；优先 6 到 14 个汉字。',
    '',
    `用户提问：${compactPrompt}`,
    compactAnswer ? `AI回答摘要：${compactAnswer}` : '',
  ].filter(Boolean).join('\n');

  const result = await sendDeepSeekMessage(titlePrompt, {
    mode: 'research',
    thinkingMode: 'fast',
    searchModes: [],
    purpose: 'conversation-title',
  });

  return normalizeConversationTitle(result.content);
};
