import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import chatHistoryHandler from './api/chat-history.js'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import skillsHandler from './api/skills.js'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import templatesHandler from './api/templates.js'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import skillCreatorHandler from './api/skill-creator.js'
// @ts-expect-error - Vercel API handler is plain JS and reused by the Vite dev middleware.
import skillCreatorGuideOptionsHandler from './api/skill-creator-guide-options.js'

const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
const DEEPSEEK_UPSTREAM_TIMEOUT_MS = 80_000;

type DeepSeekChatRequestBody = {
  prompt?: unknown;
  options?: Record<string, unknown>;
  stream?: unknown;
};

type DeepSeekStreamChunk = {
  error?: {
    message?: string;
  };
  model?: string;
	  choices?: Array<{
	    delta?: {
	      content?: string;
	      reasoning_content?: string;
	    };
	  }>;
	};

const sendJson = (response: ServerResponse, statusCode: number, payload: unknown) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const writeStreamChunk = async (response: ServerResponse, chunk: string) => {
  if (response.writableEnded || response.destroyed) return;

  if (!response.write(chunk)) {
    await new Promise<void>((resolve) => {
      const finish = () => {
        response.off('drain', finish);
        response.off('close', finish);
        resolve();
      };

      response.once('drain', finish);
      response.once('close', finish);
    });
  }

  (response as ServerResponse & { flush?: () => void }).flush?.();
};

const sendStreamEvent = async (response: ServerResponse, event: string, payload: unknown) => {
  await writeStreamChunk(response, `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
};

const sanitizeProviderError = (message: string) => message
  .replace(/DEEPSEEK_API_KEY/g, '模型服务密钥')
  .replace(/DEEPSEEK_BASE_URL/g, '模型服务地址')
  .replace(/DeepSeek/gi, '模型服务');

const normalizeDeepSeekError = (message: string) => {
  if (/provider returned error/i.test(message)) {
    return '上游模型返回异常，请稍后重试或切换模型';
  }

  return sanitizeProviderError(message);
};

const readDeepSeekError = (data: unknown, fallback: string) => {
  let message = '';

  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error?: unknown }).error;

    if (error && typeof error === 'object' && 'message' in error) {
      const nestedMessage = (error as { message?: unknown }).message;
      if (typeof nestedMessage === 'string' && nestedMessage.trim()) message = nestedMessage;
    }

    if (!message && typeof error === 'string' && error.trim()) message = error;
  }

  return normalizeDeepSeekError(message || fallback);
};

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const shouldIncludeSkillRuntimeFile = (file: unknown) => {
  if (!file || typeof file !== 'object') return false;
  const path = 'path' in file && typeof file.path === 'string' ? file.path : 'SKILL.md';
  return path === 'SKILL.md' || path.startsWith('references/');
};

const isConversationTitleRequest = (options: Record<string, unknown> = {}) => options.purpose === 'conversation-title';

const isThinkingEnabled = (options: Record<string, unknown> = {}) =>
  options.thinkingMode === 'thinking' && !isConversationTitleRequest(options);

const buildDeepSeekUpstreamBody = ({
  model,
  messages,
  maxTokens,
  options = {},
  stream = false,
}: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  options?: Record<string, unknown>;
  stream?: boolean;
}) => {
  const thinkingEnabled = isThinkingEnabled(options);
  return {
    model,
    messages,
    max_tokens: maxTokens,
    stream,
    thinking: {
      type: thinkingEnabled ? 'enabled' : 'disabled',
    },
    ...(thinkingEnabled
      ? { reasoning_effort: 'high' }
      : { temperature: 0.2 }),
  };
};

const buildMessages = (prompt: string, options: Record<string, unknown> = {}) => {
  if (isConversationTitleRequest(options)) {
    return [
      {
        role: 'system',
        content: [
          '你是“法律版”产品的历史会话标题生成器。',
          '只输出一个简短中文标题，不要解释，不要加引号，不要输出列表或标点结尾。',
          '标题必须概括用户真实意图，不能使用“新会话”。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
  }

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
        .filter(shouldIncludeSkillRuntimeFile)
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
        '页面支持 Markdown 展示，但不要滥用加粗标记。',
        '如果用户要求生成可编辑文件、文档、模板、合同、函件、代码或其他可独立预览的产物，请在简短说明后用 Markdown 代码块输出完整文件内容。',
        '文件代码块格式要求：代码块前单独写一行“文件名：xxx.ext”；代码块语言使用 markdown、html、json、txt、docx 或具体代码语言。',
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

const handleDeepSeekStreamFrame = async (frame: string, response: ServerResponse) => {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!data) return false;
  if (data === '[DONE]') {
    await sendStreamEvent(response, 'done', {});
    return true;
  }

  const payload = JSON.parse(data) as DeepSeekStreamChunk;

  if (payload.error) {
    await sendStreamEvent(response, 'error', {
      error: normalizeDeepSeekError(payload.error.message || 'AI 调用失败'),
    });
    return true;
  }

  if (payload.model) {
    await sendStreamEvent(response, 'meta', { model: payload.model });
  }

  const content = payload.choices
    ?.map((choice) => `${choice.delta?.reasoning_content || ''}${choice.delta?.content || ''}`)
    .join('');

  if (content) {
    await sendStreamEvent(response, 'content', { content });
  }

  return false;
};

const forwardDeepSeekStream = async (
  upstreamResponse: Response,
  response: ServerResponse,
  model: string,
) => {
  if (!upstreamResponse.body) {
    throw new Error('模型服务未返回可读取的流');
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.socket?.setNoDelay?.(true);
  response.flushHeaders?.();
  await sendStreamEvent(response, 'meta', { model });

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
        isDone = await handleDeepSeekStreamFrame(frame, response);
        if (isDone) break;
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n');
  const remainingFrame = buffer.trim();

  if (!isDone && remainingFrame) {
    isDone = await handleDeepSeekStreamFrame(remainingFrame, response);
  }

  if (!isDone) {
    await sendStreamEvent(response, 'done', {});
  }

  response.end();
};

type DeepSeekChatResponse = {
  error?: {
    message?: string;
  };
	  choices?: Array<{
	    message?: {
	      content?: string;
	      reasoning_content?: string;
	    };
	  }>;
  model?: string;
  usage?: unknown;
};

const createDeepSeekChatDevPlugin = (env: Record<string, string>): Plugin => ({
  name: 'deepseek-chat-dev',
  configureServer(server) {
    server.middlewares.use('/api/chat-history', async (request, response) => {
      await chatHistoryHandler(request, response);
    });

    server.middlewares.use('/api/skills', async (request, response) => {
      await skillsHandler(request, response);
    });

    server.middlewares.use('/api/templates', async (request, response) => {
      await templatesHandler(request, response);
    });

    server.middlewares.use('/api/skill-creator', async (request, response) => {
      await skillCreatorHandler(request, response);
    });

    server.middlewares.use('/api/skill-creator-guide-options', async (request, response) => {
      await skillCreatorGuideOptionsHandler(request, response);
    });

    server.middlewares.use('/api/deepseek-chat', async (request, response) => {
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed' });
        return;
      }

      const apiKey = env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
      const model = DEFAULT_DEEPSEEK_MODEL;
      const baseUrl = (env.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, '');

      if (!apiKey) {
        sendJson(response, 500, { error: '模型服务暂未配置，请联系管理员' });
        return;
      }

      try {
        const body = await readJsonBody(request) as DeepSeekChatRequestBody;
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
	          body: JSON.stringify(buildDeepSeekUpstreamBody({
	            model,
	            messages: buildMessages(prompt, options),
	            maxTokens: isConversationTitleRequest(options) ? 80 : 1800,
	            stream: wantsStream,
	            options,
	          })),
        }).finally(() => {
          clearTimeout(timeout);
        });

        if (wantsStream) {
          if (!upstreamResponse.ok) {
            const upstreamData = await upstreamResponse.json().catch(() => null);
            const errorMessage = readDeepSeekError(upstreamData, `AI 请求失败 (${upstreamResponse.status})`);
            sendJson(response, upstreamResponse.status, { error: errorMessage });
            return;
          }

          await forwardDeepSeekStream(upstreamResponse, response, model);
          return;
        }

        const upstreamData = await upstreamResponse.json().catch(() => null) as DeepSeekChatResponse | null;

        if (!upstreamResponse.ok) {
          const errorMessage = readDeepSeekError(upstreamData, `AI 请求失败 (${upstreamResponse.status})`);
          sendJson(response, upstreamResponse.status, { error: errorMessage });
          return;
        }

	        const message = upstreamData?.choices?.[0]?.message;
	        const content = `${typeof message?.reasoning_content === 'string' ? message.reasoning_content : ''}${typeof message?.content === 'string' ? message.content : ''}`;

	        sendJson(response, 200, {
	          content,
          model: upstreamData?.model || model,
          usage: upstreamData?.usage || null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error && error.name === 'AbortError'
          ? 'AI 请求超时，请稍后重试'
          : error instanceof Error ? normalizeDeepSeekError(error.message) : 'AI 调用失败';

        if (response.headersSent) {
          await sendStreamEvent(response, 'error', { error: errorMessage });
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
  ]) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [vue(), createDeepSeekChatDevPlugin(env)],
  };
})
