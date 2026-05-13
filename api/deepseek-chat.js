const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const UPSTREAM_TIMEOUT_MS = 80_000;

const sendJson = (response, statusCode, payload) => {
  if (typeof response.status === 'function' && typeof response.json === 'function') {
    response.status(statusCode).json(payload);
    return;
  }

  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const writeStreamChunk = async (response, chunk) => {
  if (response.writableEnded || response.destroyed) return;

  if (!response.write(chunk)) {
    await new Promise((resolve) => {
      const finish = () => {
        response.off?.('drain', finish);
        response.off?.('close', finish);
        resolve();
      };

      response.once('drain', finish);
      response.once('close', finish);
    });
  }

  response.flush?.();
};

const sendStreamEvent = async (response, event, payload) => {
  await writeStreamChunk(response, `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
};

const readJsonBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}');

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const normalizeDeepSeekError = (message) => {
  if (/provider returned error/i.test(message)) {
    return 'DeepSeek 上游模型返回异常，请稍后重试或切换模型';
  }

  return message;
};

const readDeepSeekError = (data, fallback) => {
  let message = '';

  if (data && typeof data === 'object' && 'error' in data) {
    const error = data.error;

    if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
      message = error.message;
    }

    if (!message && typeof error === 'string' && error.trim()) message = error;
  }

  return normalizeDeepSeekError(message || fallback);
};

const shouldIncludeSkillRuntimeFile = (file) => {
  const path = typeof file?.path === 'string' ? file.path : 'SKILL.md';
  return path === 'SKILL.md' || path.startsWith('references/');
};

const isConversationTitleRequest = (options = {}) => options?.purpose === 'conversation-title';

const isThinkingEnabled = (options = {}) =>
  options?.thinkingMode === 'thinking' && !isConversationTitleRequest(options);

const buildUpstreamBody = ({
  model,
  messages,
  maxTokens,
  options = {},
  stream = false,
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

const buildMessages = (prompt, options = {}) => {
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
  const searchModeLabel = Array.isArray(options.searchModes) && options.searchModes.length
    ? options.searchModes.join(', ')
    : 'none';
  const templateLine = options.templateName ? `用户选中的模板：${options.templateName}` : '用户未选择固定模板。';
  const selectedSkills = Array.isArray(options.selectedSkills) ? options.selectedSkills : [];
  const skillContext = selectedSkills
    .filter((skill) => skill && typeof skill === 'object')
    .map((skill) => {
      const name = typeof skill.name === 'string' ? skill.name : '未命名技能';
      const description = typeof skill.description === 'string' ? skill.description : '';
      const files = Array.isArray(skill.files) ? skill.files : [];
      const fileText = files
        .filter(shouldIncludeSkillRuntimeFile)
        .filter((file) => file && typeof file === 'object')
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
        `当前对话模式：${modeLabel}；推理强度：${thinkingLabel}；启用检索开关：${searchModeLabel}。`,
        templateLine,
        skillContext ? `用户本次已选择以下技能。请优先按照技能文件的触发场景、工作步骤、输出要求、质量检查点和边界规则执行：\n${skillContext}` : '用户本次未选择固定技能。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: prompt,
    },
  ];
};

const handleDeepSeekStreamFrame = async (frame, response) => {
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

  const payload = JSON.parse(data);

  if (payload.error) {
    await sendStreamEvent(response, 'error', {
      error: normalizeDeepSeekError(payload.error.message || 'DeepSeek 调用失败'),
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

const forwardDeepSeekStream = async (upstreamResponse, response, model) => {
  if (!upstreamResponse.body) {
    throw new Error('DeepSeek 未返回可读取的流');
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

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = DEFAULT_MODEL;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  if (!apiKey) {
    sendJson(response, 500, { error: '缺少 DEEPSEEK_API_KEY 环境变量' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      sendJson(response, 400, { error: '缺少 prompt' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const wantsStream = body.stream === true;
    const options = body.options && typeof body.options === 'object' ? body.options : {};

    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildUpstreamBody({
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
        const errorMessage = readDeepSeekError(upstreamData, `DeepSeek 请求失败 (${upstreamResponse.status})`);
        sendJson(response, upstreamResponse.status, { error: errorMessage });
        return;
      }

      await forwardDeepSeekStream(upstreamResponse, response, model);
      return;
    }

    const upstreamData = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const errorMessage = readDeepSeekError(upstreamData, `DeepSeek 请求失败 (${upstreamResponse.status})`);
      sendJson(response, upstreamResponse.status, { error: errorMessage });
      return;
    }

    const message = upstreamData?.choices?.[0]?.message;
    const content = `${typeof message?.reasoning_content === 'string' ? message.reasoning_content : ''}${typeof message?.content === 'string' ? message.content : ''}`;

    sendJson(response, 200, {
      content: typeof content === 'string' ? content : '',
      model: upstreamData?.model || model,
      usage: upstreamData?.usage || null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'DeepSeek 请求超时，请稍后重试'
        : error instanceof Error ? normalizeDeepSeekError(error.message) : 'DeepSeek 调用失败';

    if (response.headersSent) {
      await sendStreamEvent(response, 'error', { error: errorMessage });
      response.end();
      return;
    }

    sendJson(response, 500, { error: errorMessage });
  }
}
