import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import chatHistoryHandler from './api/chat-history.js'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import skillsHandler from './api/skills.js'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import skillCreatorHandler from './api/skill-creator.js'

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
const DEEPSEEK_UPSTREAM_TIMEOUT_MS = 80_000;

type OpenRouterChatRequestBody = {
  prompt?: unknown;
  options?: Record<string, unknown>;
  stream?: unknown;
};

type OpenRouterStreamChunk = {
  error?: {
    message?: string;
  };
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

const sendJson = (response: ServerResponse, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const sendStreamEvent = (response: ServerResponse, event: string, payload: unknown) => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const normalizeOpenRouterError = (message: string) => {
  if (/provider returned error/i.test(message)) {
    return 'DeepSeek 上游模型返回异常，请稍后重试或切换模型';
  }

  return message;
};

const readOpenRouterError = (data: unknown, fallback: string) => {
  let message = '';

  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error?: unknown }).error;

    if (error && typeof error === 'object' && 'message' in error) {
      const nestedMessage = (error as { message?: unknown }).message;
      if (typeof nestedMessage === 'string' && nestedMessage.trim()) message = nestedMessage;
    }

    if (!message && typeof error === 'string' && error.trim()) message = error;
  }

  return normalizeOpenRouterError(message || fallback);
};

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const buildMessages = (prompt: string, options: Record<string, unknown> = {}) => {
  const modeLabel = options.mode === 'consult' ? '咨询模式' : '研究模式';
  const thinkingLabel = options.thinkingMode === 'thinking' ? '思考' : '快速';
  const searchModes = Array.isArray(options.searchModes) ? options.searchModes.filter((item) => typeof item === 'string') : [];
  const templateName = typeof options.templateName === 'string' ? options.templateName : '';
  const selectedSkills = Array.isArray(options.selectedSkills) ? options.selectedSkills : [];
  const skillContext = selectedSkills
    .filter((skill): skill is Record<string, unknown> => Boolean(skill) && typeof skill === 'object')
    .map((skill) => {
      const name = typeof skill.name === 'string' ? skill.name : '未命名技能';
      const description = typeof skill.description === 'string' ? skill.description : '';
      const files = Array.isArray(skill.files) ? skill.files : [];
      const fileText = files
        .filter((file): file is Record<string, unknown> => Boolean(file) && typeof file === 'object')
        .map((file) => {
          const path = typeof file.path === 'string' ? file.path : 'SKILL.md';
          const content = typeof file.content === 'string' ? file.content : '';
          return content.trim() ? `文件：${path}\n${content}` : '';
        })
        .filter(Boolean)
        .join('\n\n');

      return [`技能：${name}`, description ? `说明：${description}` : '', fileText].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  return [
    {
      role: 'system',
      content: [
        '你是“法律版”产品里的 AI 法律助手。',
        '请用中文回答，结论清楚、分点紧凑，必要时提示法律风险和需要补充的事实。',
        '页面会以纯文本展示回答，不要使用 Markdown 加粗标记。',
        '不要编造法律依据；无法确认的规则请说明需要进一步检索或由律师复核。',
        `当前对话模式：${modeLabel}；推理强度：${thinkingLabel}；启用检索开关：${searchModes.join(', ') || 'none'}。`,
        templateName ? `用户选中的模板：${templateName}` : '用户未选择固定模板。',
        skillContext ? `用户本次已选择以下技能。请优先按照技能文件的触发场景、工作步骤、输出要求、质量检查点和边界规则执行：\n${skillContext}` : '用户本次未选择固定技能。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: prompt,
    },
  ];
};

const handleOpenRouterStreamFrame = (frame: string, response: ServerResponse) => {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!data) return false;
  if (data === '[DONE]') {
    sendStreamEvent(response, 'done', {});
    return true;
  }

  const payload = JSON.parse(data) as OpenRouterStreamChunk;

  if (payload.error) {
    sendStreamEvent(response, 'error', {
      error: normalizeOpenRouterError(payload.error.message || 'DeepSeek 调用失败'),
    });
    return true;
  }

  if (payload.model) {
    sendStreamEvent(response, 'meta', { model: payload.model });
  }

  const content = payload.choices
    ?.map((choice) => choice.delta?.content || '')
    .join('');

  if (content) {
    sendStreamEvent(response, 'content', { content });
  }

  return false;
};

const forwardOpenRouterStream = async (
  upstreamResponse: Response,
  response: ServerResponse,
  model: string,
) => {
  if (!upstreamResponse.body) {
    throw new Error('DeepSeek 未返回可读取的流');
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders?.();
  sendStreamEvent(response, 'meta', { model });

  const reader = upstreamResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let isDone = false;

  while (!isDone) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (frame) {
        isDone = handleOpenRouterStreamFrame(frame, response);
        if (isDone) break;
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n');
  const remainingFrame = buffer.trim();

  if (!isDone && remainingFrame) {
    isDone = handleOpenRouterStreamFrame(remainingFrame, response);
  }

  if (!isDone) {
    sendStreamEvent(response, 'done', {});
  }

  response.end();
};

type OpenRouterChatResponse = {
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  model?: string;
  usage?: unknown;
};

const createOpenRouterChatDevPlugin = (env: Record<string, string>): Plugin => ({
  name: 'openrouter-chat-dev',
  configureServer(server) {
    server.middlewares.use('/api/chat-history', async (request, response) => {
      await chatHistoryHandler(request, response);
    });

    server.middlewares.use('/api/skills', async (request, response) => {
      await skillsHandler(request, response);
    });

    server.middlewares.use('/api/skill-creator', async (request, response) => {
      await skillCreatorHandler(request, response);
    });

    server.middlewares.use('/api/openrouter-chat', async (request, response) => {
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed' });
        return;
      }

      const apiKey = env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
      const model = env.DEEPSEEK_MODEL || process.env.DEEPSEEK_MODEL || env.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_DEEPSEEK_MODEL;
      const baseUrl = (env.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, '');

      if (!apiKey) {
        sendJson(response, 500, { error: '缺少 DEEPSEEK_API_KEY 环境变量' });
        return;
      }

      try {
        const body = await readJsonBody(request) as OpenRouterChatRequestBody;
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        const options = body.options && typeof body.options === 'object' ? body.options : {};
        const wantsStream = body.stream === true;

        if (!prompt) {
          sendJson(response, 400, { error: '缺少 prompt' });
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DEEPSEEK_UPSTREAM_TIMEOUT_MS);

        const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: buildMessages(prompt, options),
            temperature: 0.2,
            max_tokens: 1800,
            stream: wantsStream,
          }),
        }).finally(() => {
          clearTimeout(timeout);
        });

        if (wantsStream) {
          if (!upstreamResponse.ok) {
            const upstreamData = await upstreamResponse.json().catch(() => null);
            const errorMessage = readOpenRouterError(upstreamData, `DeepSeek 请求失败 (${upstreamResponse.status})`);
            sendJson(response, upstreamResponse.status, { error: errorMessage });
            return;
          }

          await forwardOpenRouterStream(upstreamResponse, response, model);
          return;
        }

        const upstreamData = await upstreamResponse.json().catch(() => null) as OpenRouterChatResponse | null;

        if (!upstreamResponse.ok) {
          const errorMessage = readOpenRouterError(upstreamData, `DeepSeek 请求失败 (${upstreamResponse.status})`);
          sendJson(response, upstreamResponse.status, { error: errorMessage });
          return;
        }

        const content = upstreamData?.choices?.[0]?.message?.content;

        sendJson(response, 200, {
          content: typeof content === 'string' ? content : '',
          model: upstreamData?.model || model,
          usage: upstreamData?.usage || null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error && error.name === 'AbortError'
          ? 'DeepSeek 请求超时，请稍后重试'
          : error instanceof Error ? normalizeOpenRouterError(error.message) : 'DeepSeek 调用失败';

        if (response.headersSent) {
          sendStreamEvent(response, 'error', { error: errorMessage });
          response.end();
          return;
        }

        sendJson(response, 500, {
          error: errorMessage,
        });
      }
    });
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_BASE_URL',
    'DEEPSEEK_MODEL',
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
  ]) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [vue(), createOpenRouterChatDevPlugin(env)],
  };
})
