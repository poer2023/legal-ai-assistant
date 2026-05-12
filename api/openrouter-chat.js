const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const UPSTREAM_TIMEOUT_MS = 80_000;

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

const buildMessages = (prompt, options = {}) => {
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
        '页面会以纯文本展示回答，不要使用 Markdown 加粗标记。',
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

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  if (!apiKey) {
    response.status(500).json({ error: '缺少 DEEPSEEK_API_KEY 环境变量' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      response.status(400).json({ error: '缺少 prompt' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(prompt, body.options),
        temperature: 0.2,
        max_tokens: 1800,
      }),
    }).finally(() => {
      clearTimeout(timeout);
    });

    const upstreamData = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const errorMessage = upstreamData?.error?.message || `DeepSeek 请求失败 (${upstreamResponse.status})`;
      response.status(upstreamResponse.status).json({ error: errorMessage });
      return;
    }

    const content = upstreamData?.choices?.[0]?.message?.content;

    response.status(200).json({
      content: typeof content === 'string' ? content : '',
      model: upstreamData?.model || model,
      usage: upstreamData?.usage || null,
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error && error.name === 'AbortError'
        ? 'DeepSeek 请求超时，请稍后重试'
        : error instanceof Error ? error.message : 'DeepSeek 调用失败',
    });
  }
}
