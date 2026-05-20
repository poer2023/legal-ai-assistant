import type { SkillCatalogItem } from '../data/skillCatalog';

export type SkillCreatorAnswers = {
  scenario: string;
  source: string;
  output: string;
  scope: string;
  intakeSummary?: string[];
  materials?: string[];
  outputHints?: string[];
};

type SkillCreatorStreamPayload = {
  content?: string;
  error?: string;
  fallbackUsed?: boolean;
  model?: string;
  status?: 'checking' | 'complete' | 'error';
  message?: string;
  skill?: SkillCatalogItem;
  answerContent?: string;
};

type SkillCreatorStreamCallbacks = {
  onFinalContent?: (content: string) => void;
  onMeta?: (model: string) => void;
  onThinking?: (token: string) => void;
  onToken?: (token: string, content: string) => void;
  onValidation?: (payload: { status: 'checking' | 'complete' | 'error'; message?: string }) => void;
};

type SkillCreatorStreamOptions = {
  thinkingMode?: string;
};

export type SkillCreatorStreamResult = {
  answerContent: string;
  fallbackUsed: boolean;
  model: string;
  skill: SkillCatalogItem;
};

const createRequestTimeout = (controller: AbortController, timeoutMs = 180_000) =>
  window.setTimeout(() => controller.abort(), timeoutMs);

const parseStreamFrame = (frame: string): { event: string; payload: SkillCreatorStreamPayload | null } => {
  const event = frame
    .split('\n')
    .find((line) => line.startsWith('event:'))
    ?.slice(6)
    .trim() || 'message';

  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!data) return { event, payload: null };

  try {
    return { event, payload: JSON.parse(data) as SkillCreatorStreamPayload };
  } catch {
    return { event, payload: { content: data } };
  }
};

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

export const createSkillWithSkillCreator = async (
  brief: string,
  answers: SkillCreatorAnswers,
): Promise<SkillCatalogItem> => {
  const response = await fetch('/api/skill-creator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ brief, answers }),
  });

  const data = await response.json().catch(() => null) as { skill?: SkillCatalogItem; error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error || `skill-creator 创建失败 (${response.status})`);
  }

  if (!data?.skill) {
    throw new Error('skill-creator 创建结果为空');
  }

  return data.skill;
};

export const streamSkillWithSkillCreator = async (
  brief: string,
  answers: SkillCreatorAnswers,
  callbacks: SkillCreatorStreamCallbacks = {},
  options: SkillCreatorStreamOptions = {},
): Promise<SkillCreatorStreamResult> => {
  const controller = new AbortController();
  const timeout = createRequestTimeout(controller);

  const response = await fetch('/api/skill-creator', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ brief, answers, options, stream: true }),
    signal: controller.signal,
  }).catch((error) => {
    window.clearTimeout(timeout);
    throw error;
  });

  if (!response.ok || !response.body) {
    window.clearTimeout(timeout);
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `skill-creator 创建失败 (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let answerContent = '';
  let model = 'deepseek-v4-flash';
  let skill: SkillCatalogItem | null = null;
  let fallbackUsed = false;

  const handleFrame = async (frame: string) => {
    const { event, payload } = parseStreamFrame(frame);
    if (!payload) return;

    if (event === 'error' || payload.error) {
      throw new Error(payload.error || 'skill-creator 创建失败');
    }

    if (event === 'meta' && payload.model) {
      model = payload.model;
      callbacks.onMeta?.(model);
      return;
    }

    if (event === 'thinking' && payload.content) {
      callbacks.onThinking?.(payload.content);
      await waitForPaint();
      return;
    }

    if (event === 'content' && payload.content) {
      content += payload.content;
      callbacks.onToken?.(payload.content, content);
      await waitForPaint();
      return;
    }

    if (event === 'validation' && payload.status) {
      callbacks.onValidation?.({
        status: payload.status,
        message: payload.message,
      });
      await waitForPaint();
      return;
    }

    if (event === 'finalContent' && typeof payload.content === 'string') {
      answerContent = payload.content;
      callbacks.onFinalContent?.(answerContent);
      return;
    }

    if (event === 'skill' && payload.skill) {
      skill = payload.skill;
      model = payload.model || model;
      fallbackUsed = Boolean(payload.fallbackUsed);
      answerContent = payload.answerContent || answerContent || content;
      callbacks.onMeta?.(model);
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (frame) await handleFrame(frame);

        boundary = buffer.indexOf('\n\n');
      }
    }

    buffer += decoder.decode().replace(/\r\n/g, '\n');
    if (buffer.trim()) await handleFrame(buffer.trim());
  } finally {
    window.clearTimeout(timeout);
  }

  if (!skill) {
    throw new Error('skill-creator 创建结果为空');
  }

  return {
    answerContent: answerContent || content,
    fallbackUsed,
    model,
    skill,
  };
};
