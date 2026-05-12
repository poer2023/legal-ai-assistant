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

const slugify = (value) => {
  const ascii = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return ascii || `custom-skill-${Date.now().toString(36)}`;
};

const normalizeTags = (tags) => Array.isArray(tags)
  ? tags.filter((tag) => typeof tag === 'string' && tag.trim()).slice(0, 6)
  : [];

const normalizeFileType = (path) => {
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.ts')) return 'typescript';
  return 'markdown';
};

const normalizeCreatedSkill = (draft) => {
  const name = typeof draft?.name === 'string' && draft.name.trim() ? draft.name.trim() : '自建法律技能';
  const id = slugify(draft?.id || name);
  const description = typeof draft?.description === 'string' && draft.description.trim()
    ? draft.description.trim()
    : '面向具体法律工作流的可复用技能。';
  const category = typeof draft?.category === 'string' && draft.category.trim() ? draft.category.trim() : '自建技能';
  const tags = normalizeTags(draft?.tags);
  const files = Array.isArray(draft?.files) ? draft.files : [];
  const normalizedFiles = files.reduce((items, file, index) => {
    const path = typeof file?.path === 'string' && file.path.trim()
      ? file.path.trim()
      : index === 0 ? 'SKILL.md' : `references/reference-${index}.md`;
    const content = typeof file?.content === 'string' ? file.content.trim() : '';

    if (!content) return items;

    items.push({
      id: `${id}-${path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || index}`,
      name: path.split('/').pop() || path,
      path,
      type: normalizeFileType(path),
      content,
    });
    return items;
  }, []);

  const workflow = Array.isArray(draft?.workflow) ? draft.workflow.filter((item) => typeof item === 'string' && item.trim()) : [];
  const triggers = Array.isArray(draft?.triggers) ? draft.triggers.filter((item) => typeof item === 'string' && item.trim()) : [];
  const inputs = Array.isArray(draft?.inputs) ? draft.inputs.filter((item) => typeof item === 'string' && item.trim()) : [];
  const output = Array.isArray(draft?.output) ? draft.output.filter((item) => typeof item === 'string' && item.trim()) : [];
  const checks = Array.isArray(draft?.checks) ? draft.checks.filter((item) => typeof item === 'string' && item.trim()) : [];
  const guardrails = Array.isArray(draft?.guardrails) ? draft.guardrails.filter((item) => typeof item === 'string' && item.trim()) : [];
  const renderBullets = (items, fallback) => (items.length ? items : fallback).map((item) => `- ${item}`).join('\n');
  const renderNumbered = (items, fallback) => (items.length ? items : fallback).map((item, index) => `${index + 1}. ${item}`).join('\n');

  if (!normalizedFiles.some((file) => file.path === 'SKILL.md')) {
    normalizedFiles.unshift({
      id: `${id}-skill`,
      name: 'SKILL.md',
      path: 'SKILL.md',
      type: 'markdown',
      content: [
        `# ${name}`,
        '',
        description,
        '',
        '## 触发场景',
        renderBullets(triggers, ['用户需要处理该法律工作流时调用。']),
        '',
        '## 输入要求',
        renderBullets(inputs, ['用户提供业务目标、材料文本、适用法域、己方立场和输出用途。']),
        '',
        '## 工作步骤',
        renderNumbered(workflow, ['识别用户材料、目标、适用法域和己方立场。', '补齐缺失事实并标记无法确认的事项。', '按法律工作流输出可编辑结果。']),
        '',
        '## 输出要求',
        renderBullets(output, ['输出结构化结论、风险提示、修改建议和待确认事项。']),
        '',
        '## 质量检查点',
        renderBullets(checks, ['结论必须能追溯到用户材料或明确假设。', '风险判断需要区分确定结论、合理推断和待律师复核事项。']),
        '',
        '## 边界规则',
        renderBullets(guardrails, ['不编造事实、法律依据或材料内容。', '不确定事项标记为待律师复核。']),
      ].join('\n'),
    });
  }

  if (!normalizedFiles.some((file) => file.path.startsWith('references/'))) {
    normalizedFiles.push({
      id: `${id}-rules`,
      name: 'rules.md',
      path: 'references/rules.md',
      type: 'markdown',
      content: [
        `# ${name}规则`,
        '',
        '## 输入核验',
        renderBullets(inputs, ['核对用户提供的主体、文件、事实、适用法域和目标是否足够。', '缺少关键材料时先列待补充事项，不直接补写事实。']),
        '',
        '## 质量检查',
        renderBullets(checks, ['输出应覆盖触发场景、处理步骤、风险提示和后续动作。', '风险判断需要区分确定结论、合理推断和待律师复核事项。']),
        '',
        '## 边界',
        renderBullets(guardrails, ['不编造法律依据、案件事实或交易背景。', '涉及重大法律后果时提示由执业律师复核。']),
      ].join('\n'),
    });
  }

  return {
    id,
    name,
    description,
    category,
    routeName: 'chat',
    tags,
    files: normalizedFiles,
    source: 'custom',
    scope: draft?.scope === 'team' ? 'team' : 'personal',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
  };
};

const extractJsonObject = (content) => {
  const trimmed = String(content || '').trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
};

const buildFallbackDraft = (brief, answers = {}) => {
  const isContractReview = /合同|红线|审查|MSA|SaaS|采购|服务|并购|投资/i.test(brief);

  if (isContractReview) {
    return {
      id: 'contract-review-redline',
      name: '合同审查与红线生成',
      description: '审查商事合同、SaaS/MSA、采购合同、服务合同和交易文件，按用户立场输出风险等级、谈判策略、可插入替代条款和对外修改理由。',
      category: '商事合同',
      tags: ['合同审查', '红线', '风险矩阵', '谈判'],
      scope: answers.scope === '团队共享' ? 'team' : 'personal',
      triggers: [
        '用户上传或粘贴合同、订单、附件、DPA、SLA、报价单或交易文件并要求审查。',
        '用户需要按客户、供应商、买方、卖方、投资方或融资方立场提出红线修改。',
        '用户需要把审查意见转成风险矩阵、谈判清单或给对方律师的修改理由。',
      ],
      inputs: [
        '合同全文及附件，包含主协议、订单、SLA、DPA、报价单、披露函或补充协议。',
        '用户立场、交易背景、适用法域、交易金额、行业、谈判底线和内部 playbook。',
        '是否需要中文审查意见、对外红线理由、内部风险 memo 或逐条替代条款。',
      ],
      workflow: [
        '先确认合同类型、用户立场、适用法域、交易金额、关键商业目标和缺失材料。',
        '阅读全文，按条款定位抽取核心义务、付款、交付/验收、变更、IP、数据、保密、违约、赔偿、责任限制、终止、争议解决和合规条款。',
        '按用户立场判断条款是否偏离常见市场标准或团队 playbook，并标注 HIGH / MEDIUM / LOW 风险。',
        '对每个高/中风险点输出问题、影响、建议立场、fallback、可插入替代条款和对外修改理由。',
        '最后输出待补充事实、必须升级律师/业务负责人决策的事项，以及可接受但需留痕的风险。',
      ],
      output: [
        '执行摘要：可签/可谈/不建议签的初步结论和前三大风险。',
        '条款级风险矩阵：条款位置、原文摘要、风险等级、己方影响、建议动作、替代条款。',
        '红线语言：可直接插入合同的中文条款或中英双语条款。',
        '谈判策略：preferred position、fallback position、对外修改理由。',
        '待确认事项：事实、附件、商业底线、法域和监管问题。',
      ],
      checks: [
        '每个重大风险必须能追溯到合同条款或明确标记为基于缺失事实的待确认风险。',
        '必须区分法律风险、商业风险、合规风险和操作风险。',
        '红线语言必须可执行、可复制，不只写原则性建议。',
        '必须检查赔偿条款是否受责任上限约束，以及责任上限例外是否过宽。',
        '必须检查自动续费、单方变更、服务暂停、数据删除/导出、审计权和终止后义务。',
      ],
      guardrails: [
        '不得编造合同中没有的条款、事实、附件或法律依据。',
        '缺少完整合同时必须说明结论仅限已提供文本。',
        '不得直接给出正式法律意见或保证某条款一定有效。',
        '涉及税务、外汇、国资、反垄断、数据出境、金融监管或劳动竞业时提示专项复核。',
      ],
    };
  }

  return {
    name: '自建法律技能',
    description: brief || '面向具体法律工作流的可复用技能。',
    category: '自建技能',
    tags: ['法律工作流', '自建技能'],
    scope: answers.scope === '团队共享' ? 'team' : 'personal',
    triggers: [answers.scenario || '用户需要处理该法律工作流时调用。'],
    inputs: [answers.source || '用户提供业务目标、事实材料、适用法域和输出用途。'],
    workflow: ['确认工作目标、适用法域和材料范围。', '识别缺失事实和待确认事项。', '按用户期望输出结构化结果。'],
    output: [answers.output || '输出结构化结论、风险提示和待确认事项。'],
    checks: ['结论必须能追溯到用户材料或明确假设。', '不确定事项必须标记为待律师复核。'],
    guardrails: ['不编造事实、法律依据或材料内容。', '重大法律后果需提示律师复核。'],
  };
};

const buildMessages = (brief, answers) => [
  {
    role: 'system',
    content: [
      '你是“法律版”产品的 skill-creator。',
      '请根据用户需求创建一个可复用的法律工作流 skill。',
      '必须只输出 JSON，不要 Markdown 代码块，不要解释。',
      'JSON 字段：id,name,description,category,tags,scope,triggers,inputs,workflow,output,checks,guardrails,files。',
      'files 必须至少包含 SKILL.md 和 references/rules.md；content 用中文，必须具体到该技能，不要泛泛写“识别材料和目标”。',
      'SKILL.md 至少包含：触发场景、输入要求、工作步骤、输出格式、质量检查点、边界规则。',
      'references/rules.md 至少包含：审查维度、风险等级规则、输出表格字段、常见高风险条款、中文本地化注意事项。',
      '不得编造具体案件事实或法律依据；不确定内容写成待确认规则。',
    ].join('\n'),
  },
  {
    role: 'user',
    content: [
      `用户需求：${brief}`,
      `工作场景：${answers?.scenario || '未说明'}`,
      `输入来源：${answers?.source || '未说明'}`,
      `期望输出：${answers?.output || '未说明'}`,
      `使用范围：${answers?.scope || '未说明'}`,
    ].join('\n'),
  },
];

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  if (!apiKey) {
    sendJson(response, 500, { error: '缺少 DEEPSEEK_API_KEY 环境变量' });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const brief = typeof body?.brief === 'string' ? body.brief.trim() : '';

    if (!brief) {
      sendJson(response, 400, { error: '缺少技能需求' });
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
        messages: buildMessages(brief, body.answers || {}),
        temperature: 0.2,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
      }),
    }).finally(() => {
      clearTimeout(timeout);
    });

    const upstreamData = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const errorMessage = upstreamData?.error?.message || `DeepSeek 请求失败 (${upstreamResponse.status})`;
      sendJson(response, upstreamResponse.status, { error: errorMessage });
      return;
    }

    const content = upstreamData?.choices?.[0]?.message?.content;
    let parsed = null;
    try {
      parsed = extractJsonObject(content);
    } catch {
      parsed = null;
    }

    sendJson(response, 200, {
      skill: normalizeCreatedSkill(parsed || buildFallbackDraft(brief, body.answers || {})),
      model: upstreamData?.model || model,
      fallbackUsed: !parsed,
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error && error.name === 'AbortError'
        ? 'skill-creator 请求超时，请稍后重试'
        : error instanceof Error ? error.message : 'skill-creator 创建失败',
    });
  }
}
