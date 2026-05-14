const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const UPSTREAM_TIMEOUT_MS = 45_000;

const rootNeedOptions = [
  {
    id: 'compliance-review-skill',
    label: '合规审查技能',
    description: '用于规则核查、差距分析、整改建议和风险分级。',
    recommended: true,
  },
  {
    id: 'contract-review-skill',
    label: '合同审查技能',
    description: '用于合同审查、红线修改、谈判清单和风险矩阵。',
  },
  {
    id: 'document-drafting-skill',
    label: '文书起草技能',
    description: '用于生成 Word 文书初稿、结构稿或可复制段落。',
  },
  {
    id: 'case-material-skill',
    label: '案件材料整理技能',
    description: '用于整理事实、证据、时间线、争议焦点和待补材料。',
  },
  {
    id: 'legal-research-skill',
    label: '法律检索研究技能',
    description: '用于法规、案例、监管口径或专题法律问题研究。',
  },
  {
    id: 'custom-legal-skill',
    label: '其他自定义技能',
    description: '用自己的话描述任务目标，再生成更贴合的技能结构。',
  },
];

const fallbackPlanSteps = [
  {
    field: 'source',
    title: '技能运行时主要读取什么材料？',
    assetSlots: [
      {
        id: 'runtime-drafts',
        type: 'draft',
        title: '建议补充运行底稿',
        description: '可以上传或选择一份典型材料，帮助技能明确启动时要读取哪些文件。',
        optional: true,
        allowLocal: true,
        allowKnowledge: true,
      },
      {
        id: 'output-template',
        type: 'template',
        title: '建议选择输出模板',
        description: '如果技能要稳定复用某种文书结构，可以选择一个模板作为格式约束。',
        optional: true,
        allowTemplate: true,
      },
    ],
    options: [
      {
        id: 'plain-text-rules',
        label: '纯文字描述规则',
        description: '用户用自然语言说明任务目标、材料范围、适用规则和限制。',
        recommended: true,
      },
      {
        id: 'uploaded-materials',
        label: '上传或粘贴材料',
        description: '每次使用时提供合同、事实说明、制度、邮件、证据或截图。',
      },
      {
        id: 'templates-and-playbooks',
        label: '模板 / Playbook',
        description: '基于已有模板、团队口径、清单或示例输出生成。',
      },
      {
        id: 'knowledge-base',
        label: '知识库资料',
        description: '需要参考团队沉淀的规则、案例、条款库或历史交付。',
      },
    ],
  },
  {
    field: 'output',
    title: '希望这项技能稳定产出什么？',
    options: [
      {
        id: 'word-draft',
        label: 'Word 文书初稿',
        description: '输出可继续编辑的正式文档、报告、备忘录或意见书草稿。',
        recommended: true,
      },
      {
        id: 'risk-matrix',
        label: '风险矩阵',
        description: '按事项、依据、风险等级、影响、建议动作组织结果。',
      },
      {
        id: 'review-checklist',
        label: '审查清单',
        description: '输出逐项核查点、判断标准、通过条件和待确认事项。',
      },
      {
        id: 'workflow-output',
        label: '工作流结果',
        description: '输出步骤化处理结果、结论摘要、下一步动作和复核点。',
      },
    ],
  },
  {
    field: 'scope',
    title: '这项技能先按什么范围设计？',
    options: [
      {
        id: 'personal',
        label: '仅个人使用',
        description: '先服务自己的高频工作流，边界和示例可以更贴近个人用法。',
        recommended: true,
      },
      {
        id: 'team',
        label: '团队共享',
        description: '面向团队复用，需要更明确的触发条件、质量门槛和边界规则。',
      },
      {
        id: 'personal-draft',
        label: '个人草稿标准',
        description: '先保存为个人技能，后续根据使用效果再继续调整或共享。',
      },
    ],
  },
];

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

const slugify = (value, fallback) => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || fallback;
};

const normalizeOption = (option, index, fallbackPrefix) => {
  if (!option || typeof option !== 'object') return null;

  const label = typeof option.label === 'string' ? option.label.trim() : '';
  const description = typeof option.description === 'string' ? option.description.trim() : '';
  if (!label || !description) return null;

  return {
    id: slugify(option.id || label, `${fallbackPrefix}-${index + 1}`),
    label: label.slice(0, 32),
    description: description.slice(0, 96),
    recommended: index === 0 || option.recommended === true,
  };
};

const normalizeOptions = (options, fallback, fallbackPrefix) => {
  const source = Array.isArray(options) ? options : [];
  const seen = new Set();
  const normalized = [];

  for (const option of source) {
    const next = normalizeOption(option, normalized.length, fallbackPrefix);
    if (!next || seen.has(next.id)) continue;
    seen.add(next.id);
    normalized.push(next);
    if (normalized.length >= 6) break;
  }

  if (!normalized.some((option) => option.recommended) && normalized[0]) {
    normalized[0] = { ...normalized[0], recommended: true };
  }

  return normalized.length >= 3 ? normalized : fallback;
};

const normalizeAssetSlotType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  return type === 'template' ? 'template' : 'draft';
};

const normalizeAssetSlot = (slot, index, stepField) => {
  if (!slot || typeof slot !== 'object') return null;

  const type = normalizeAssetSlotType(slot.type || slot.kind);
  const title = typeof slot.title === 'string' ? slot.title.trim() : '';
  const description = typeof slot.description === 'string' ? slot.description.trim() : '';

  return {
    id: slugify(slot.id || title || `${stepField}-${type}`, `asset-${index + 1}`),
    type,
    title: (title || (type === 'template' ? '建议选择输出模板' : '建议补充底稿')).slice(0, 32),
    description: (description || (type === 'template'
      ? '选择一个模板作为技能的输出格式约束。'
      : '补充一份典型材料，帮助技能明确输入要求。')).slice(0, 120),
    optional: slot.optional !== false,
    allowLocal: type === 'draft' && slot.allowLocal !== false,
    allowKnowledge: type === 'draft' && slot.allowKnowledge !== false,
    allowTemplate: type === 'template' || slot.allowTemplate === true,
  };
};

const inferAssetSlots = (step) => {
  const text = [
    step?.field,
    step?.title,
    ...(Array.isArray(step?.options) ? step.options.flatMap((option) => [
      option?.label,
      option?.description,
    ]) : []),
  ].filter(Boolean).join('\n');
  const slots = [];

  if (/材料|底稿|上传|文件|证据|合同|附件|来源|source|input/i.test(text)) {
    slots.push({
      id: 'runtime-drafts',
      type: 'draft',
      title: '建议补充运行底稿',
      description: '可以上传本地文件或从知识库选择一份典型材料；非必填。',
      optional: true,
      allowLocal: true,
      allowKnowledge: true,
    });
  }

  if (/模板|格式|样例|文书|输出|条款库|template|output/i.test(text)) {
    slots.push({
      id: 'output-template',
      type: 'template',
      title: '建议选择输出模板',
      description: '可以选择一个模板，让技能学习稳定的输出结构；非必填。',
      optional: true,
      allowTemplate: true,
    });
  }

  return slots;
};

const normalizeAssetSlots = (step, field) => {
  const source = Array.isArray(step?.assetSlots) ? step.assetSlots : [];
  const normalized = source
    .map((slot, index) => normalizeAssetSlot(slot, index, field))
    .filter(Boolean);

  const slots = normalized.length ? normalized : inferAssetSlots(step);
  const seen = new Set();
  return slots.filter((slot) => {
    const key = `${slot.type}:${slot.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 2);
};

const normalizeStep = (step, index) => {
  if (!step || typeof step !== 'object') return null;

  const title = typeof step.title === 'string' ? step.title.trim() : '';
  const rawField = typeof step.field === 'string' ? step.field.trim() : title;
  if (!title) return null;

  const field = slugify(rawField, `question-${index + 2}`);
  const fallback = fallbackPlanSteps[index % fallbackPlanSteps.length]?.options || fallbackPlanSteps[0].options;
  const options = normalizeOptions(step.options, fallback, field);

  return {
    field,
    title: title.replace(/[？?]?$/, '？'),
    options,
    assetSlots: normalizeAssetSlots({ ...step, options }, field),
  };
};

const normalizePlanSteps = (value) => {
  const source = Array.isArray(value?.steps) ? value.steps : [];
  const seen = new Set();
  const steps = [];

  for (const rawStep of source) {
    const step = normalizeStep(rawStep, steps.length);
    if (!step || seen.has(step.field)) continue;
    seen.add(step.field);
    steps.push(step);
    if (steps.length >= 4) break;
  }

  return steps.length >= 2 ? steps : fallbackPlanSteps;
};

const safeJsonObject = (content) => {
  const text = String(content || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
};

const buildRootOptionsMessages = ({ currentText }) => [
  {
    role: 'system',
    content: [
      '你是“法律版”产品中 skill-creator selector 的根需求识别器。',
      '任务：根据主输入框里的用户文字，生成“用户根本想创建什么技能”的候选项。',
      '候选项必须是具体技能目标，不要只是“合同/诉讼/合规”这类分类。',
      '你只生成候选项，不创建技能，不输出解释，不输出 Markdown。',
      '不要编造具体法规、案件事实、内部制度或客户信息。',
      '返回 JSON object，格式固定为 {"options":[{"id":"lowercase-hyphen","label":"中文短标签","description":"中文一句说明","recommended":true}]}。',
      '必须返回 4 到 6 个 options，第一项设 recommended=true。id 必须 ASCII lowercase hyphen-case。',
    ].join('\n'),
  },
  {
    role: 'user',
    content: [
      `主输入框内容：${currentText || '未输入'}`,
      '请只围绕这段内容推断根需求候选项。',
    ].join('\n'),
  },
];

const buildFollowupPlanMessages = ({ currentText, rootNeed }) => [
  {
    role: 'system',
    content: [
      '你是“法律版”产品中 skill-creator selector 的追问规划器。',
      '任务：在用户已经选定根本需求后，一次性生成后续所有需要追问的 selector 步骤。',
      '总步数包含根需求步骤最多 5 步，所以你只能生成 2 到 4 个后续步骤。',
      '不要每一步都问泛泛分类；每一步必须能减少真实技能创建的不确定性。',
      '优先覆盖：运行时输入材料、期望输出、生成物复杂度/是否需要 references/examples/scripts/assets、使用范围或质量边界。根据根需求取舍，不要机械凑满。',
      '如果某一步适合让用户补充典型底稿、知识库文件或输出模板，请在该 step 上返回 assetSlots。assetSlots 是非必填上传/选择框，不是选项。',
      'assetSlots 只在确实有帮助时返回；材料/证据/合同/底稿/尽调类步骤通常返回 draft，输出格式/文书结构/模板类步骤通常返回 template。',
      '每个步骤给 3 到 5 个候选项，第一项 recommended=true。',
      '你只生成问题和选项，不创建技能，不输出解释，不输出 Markdown。',
      '返回 JSON object，格式固定为 {"steps":[{"field":"lowercase-hyphen","title":"中文问题","options":[{"id":"lowercase-hyphen","label":"中文短标签","description":"中文一句说明","recommended":true}],"assetSlots":[{"id":"runtime-drafts","type":"draft","title":"建议补充运行底稿","description":"中文一句说明","optional":true,"allowLocal":true,"allowKnowledge":true}]}]}。',
      'field 和 option.id 必须 ASCII lowercase hyphen-case。',
    ].join('\n'),
  },
  {
    role: 'user',
    content: [
      `主输入框内容：${currentText || '未输入'}`,
      '已选择的根本需求：',
      JSON.stringify(rootNeed || {}, null, 2),
      '',
      '请一次性生成后续 selector 步骤。',
    ].join('\n'),
  },
];

const requestDeepSeekJson = async ({ apiKey, baseUrl, messages, maxTokens }) => {
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
      model: DEFAULT_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.25,
      max_tokens: maxTokens,
      stream: false,
      thinking: { type: 'disabled' },
    }),
  }).finally(() => {
    clearTimeout(timeout);
  });

  const upstreamData = await upstreamResponse.json().catch(() => null);
  if (!upstreamResponse.ok) {
    const errorMessage = upstreamData?.error?.message || `DeepSeek 请求失败 (${upstreamResponse.status})`;
    throw new Error(errorMessage);
  }

  const content = upstreamData?.choices?.[0]?.message?.content || '';
  return {
    model: upstreamData?.model || DEFAULT_MODEL,
    data: safeJsonObject(content),
  };
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  try {
    const body = await readJsonBody(request);
    const mode = body?.mode === 'followup-plan' ? 'followup-plan' : 'root-options';
    const currentText = typeof body?.currentText === 'string' ? body.currentText.trim().slice(0, 1200) : '';

    if (!apiKey) {
      sendJson(response, 200, {
        model: DEFAULT_MODEL,
        fallbackUsed: true,
        ...(mode === 'followup-plan'
          ? { steps: fallbackPlanSteps }
          : { options: rootNeedOptions }),
        error: '缺少 DEEPSEEK_API_KEY 环境变量，已使用本地兜底选项。',
      });
      return;
    }

    if (mode === 'followup-plan') {
      const { data, model } = await requestDeepSeekJson({
        apiKey,
        baseUrl,
        messages: buildFollowupPlanMessages({
          currentText,
          rootNeed: body?.rootNeed && typeof body.rootNeed === 'object' ? body.rootNeed : {},
        }),
        maxTokens: 1800,
      });

      sendJson(response, 200, {
        model,
        fallbackUsed: !data,
        steps: normalizePlanSteps(data),
      });
      return;
    }

    const { data, model } = await requestDeepSeekJson({
      apiKey,
      baseUrl,
      messages: buildRootOptionsMessages({ currentText }),
      maxTokens: 900,
    });

    sendJson(response, 200, {
      model,
      fallbackUsed: !data,
      options: normalizeOptions(data?.options, rootNeedOptions, 'root-need'),
    });
  } catch (error) {
    sendJson(response, 200, {
      model: DEFAULT_MODEL,
      fallbackUsed: true,
      options: rootNeedOptions,
      steps: fallbackPlanSteps,
      error: error instanceof Error && error.name === 'AbortError'
        ? 'DeepSeek selector 生成超时，已使用本地兜底选项。'
        : error instanceof Error ? error.message : 'DeepSeek selector 生成失败，已使用本地兜底选项。',
    });
  }
}
