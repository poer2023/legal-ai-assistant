const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';
const STREAM_TEXT_CHUNK_SIZE = 4;
const UPSTREAM_TIMEOUT_MS = 120_000;
const SUPPORT_FILE_ORDER = [
  'references/intake.md',
  'references/checklist.md',
  'references/output-patterns.md',
  'references/quality-gates.md',
  'examples/example-input.md',
  'examples/example-output.md',
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

const splitStreamText = (content) => {
  const chars = Array.from(content || '');
  const chunks = [];
  for (let index = 0; index < chars.length; index += STREAM_TEXT_CHUNK_SIZE) {
    chunks.push(chars.slice(index, index + STREAM_TEXT_CHUNK_SIZE).join(''));
  }
  return chunks;
};

const sendContentStream = async (response, content) => {
  for (const chunk of splitStreamText(content)) {
    await sendStreamEvent(response, 'content', { content: chunk });
  }
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

const toSentence = (value, fallback) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
};

const normalizeList = (items, fallback = []) => {
  const clean = (source) => source
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim().replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter(Boolean);

  const normalized = Array.isArray(items) ? clean(items) : [];
  return normalized.length ? normalized : clean(fallback);
};

const normalizeTags = (tags) => Array.isArray(tags)
  ? tags.filter((tag) => typeof tag === 'string' && tag.trim()).slice(0, 6)
  : [];

const normalizeFileType = (path) => {
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.ts')) return 'typescript';
  return 'markdown';
};

const renderBullets = (items, fallback) =>
  (items.length ? items : fallback).map((item) => `- ${item}`).join('\n');

const renderNumbered = (items, fallback) =>
  (items.length ? items : fallback).map((item, index) => `${index + 1}. ${item}`).join('\n');

const stripSkillFrontmatter = (content) =>
  String(content || '').replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

const renderCreatedSkillIntro = (skill) => [
  `已创建技能：${skill.name}`,
  '',
  skill.description,
  '',
  '创建流程：',
].join('\n');

const renderCreatedSkillCompletion = (skill) => [
  '- 已解析用户需求并调用 skill-creator。',
  `- 已生成技能包：${skill.files.length} 个文件。`,
  '- 已写入当前技能库并完成读回校验。',
  '',
  '保存结果：',
  `- 技能 ID：${skill.id}`,
  `- 保存位置：${skill.scope === 'team' ? '团队技能库' : '个人技能库'}`,
  `- 状态：${skill.status === 'active' ? '已启用' : '草稿'}`,
  '',
  '文件结构：',
  ...skill.files.map((file) => `- ${file.path}`),
  '',
  '可在「技能管理」中查看、编辑和使用。',
].join('\n');

const renderCreatedSkillAnswer = (skill) => [
  renderCreatedSkillIntro(skill),
  renderCreatedSkillCompletion(skill),
].join('\n');

const renderGeneratedDraftAnswer = (skill) => [
  `已生成技能草稿：${skill.name}`,
  '',
  skill.description,
  '',
  '生成内容：',
  ...skill.files.map((file) => `- ${file.path}`),
  '',
  '等待系统解析 skill_json、写入技能库并完成读回校验。',
].join('\n');

const codeFenceForContent = (content) => String(content || '').includes('```') ? '````' : '```';

const languageForFileType = (type) => {
  if (type === 'typescript') return 'ts';
  if (type === 'yaml') return 'yaml';
  if (type === 'json') return 'json';
  return 'markdown';
};

const renderSystemParsedArtifacts = (skill, { fallbackUsed = false } = {}) => {
  const files = Array.isArray(skill.files) ? skill.files : [];
  const rows = files.map((file, index) => (
    `| ${index + 1} | ${file.path} | ${file.type || normalizeFileType(file.path || '')} | ${String(file.content || '').length} |`
  ));
  const fileBlocks = files.map((file, index) => {
    const content = String(file.content || '').replace(/\s+$/, '');
    const fence = codeFenceForContent(content);
    return [
      `### 系统确认生成物 ${index + 1}/${files.length}：${file.path}`,
      '',
      `${fence}${languageForFileType(file.type)}`,
      content,
      fence,
    ].join('\n');
  });

  return [
    '## 系统解析：待写入生成物',
    '',
    fallbackUsed
      ? '- DeepSeek 返回的 skill_json 未能完整解析，系统使用本地兜底草稿生成待写入技能包。'
      : '- 已解析 DeepSeek 返回的 skill_json，并得到待写入的技能包。',
    '- 以下内容是系统准备写入当前技能库的最终生成物；后续写入和持久化以这里的内容为准。',
    '',
    '### 最终生成物清单',
    '',
    '| 序号 | 路径 | 类型 | 字符数 |',
    '| --- | --- | --- | ---: |',
    ...rows,
    '',
    ...fileBlocks,
  ].join('\n');
};

const describeSupportPath = (path) => {
  if (path === 'references/intake.md') return '启动前问题、材料清单、缺失信息处理和澄清规则。';
  if (path === 'references/checklist.md') return '场景化检查清单、风险识别、分级和复核清单。';
  if (path === 'references/output-patterns.md') return '稳定输出结构、表格字段、可复制文本和禁止输出。';
  if (path === 'references/quality-gates.md') return '质量门槛、升级规则、幻觉防护和人工复核边界。';
  if (path === 'examples/example-input.md') return '示例输入结构。';
  if (path === 'examples/example-output.md') return '示例输出骨架。';
  if (path.startsWith('references/')) return '补充参考资料，按任务需要读取。';
  if (path.startsWith('examples/')) return '示例材料，按任务需要读取。';
  if (path === 'agents/openai.yaml') return 'Codex/OpenAI UI 元数据，仅在明确导出到 Codex 时使用。';
  if (path.startsWith('scripts/')) return '确定性脚本，按任务需要执行。';
  if (path.startsWith('assets/')) return '模板、样例或静态资源，按任务需要使用。';
  return '支持文件，按任务需要使用。';
};

const renderSupportFileLinks = (paths) => {
  if (!paths.length) {
    return [
      '## 需要时读取',
      '',
      '- 当前技能为单文件结构；只有用户要求更严格模板、示例、脚本或详细清单时才需要新增支持文件。',
    ].join('\n');
  }

  return [
    '## 需要时读取',
    '',
    ...paths.map((path) => `- ${path}：${describeSupportPath(path)}`),
  ].join('\n');
};

const renderSkillMarkdown = ({ id, name, description, triggers, inputs, workflow, output, checks, guardrails }, supportPaths = []) => [
  '---',
  `name: ${id}`,
  `description: ${JSON.stringify(description)}`,
  '---',
  '',
  `# ${name}`,
  '',
  '## 使用场景',
  renderBullets(triggers, ['用户需要处理该法律工作流，并希望后续重复调用同一套步骤、检查点和输出格式。']),
  '',
  '## 输入要求',
  renderBullets(inputs, ['用户提供业务目标、材料文本、适用法域、己方立场、输出用途和关键限制。']),
  '',
  '## 工作流',
  renderNumbered(workflow, ['确认目标、材料范围、适用法域和己方立场。', '识别缺失事实，先列待确认事项，不补造事实。', '按 references 中的检查清单、输出模式和边界规则生成可复用交付。']),
  '',
  '## 输出要求',
  renderBullets(output, ['输出结构化结论、风险提示、修改建议和待确认事项。']),
  '',
  '## 质量检查',
  renderBullets(checks, ['每个关键结论必须能追溯到用户材料、明确假设或 reference 规则。', '区分确定结论、合理推断和待律师复核事项。']),
  '',
  '## 边界规则',
  renderBullets(guardrails, ['不编造事实、法律依据、材料内容或团队口径。', '重大法律后果、监管问题或高风险结论需提示律师复核。']),
  '',
  renderSupportFileLinks(supportPaths),
].join('\n');

const renderIntakeReference = ({ name, category, tags, triggers, inputs }) => [
  `# ${name}启动与信息收集`,
  '',
  '## 适用边界',
  `- 技能类别：${category}`,
  `- 关键词：${tags.join('、')}`,
  renderBullets(triggers, ['用户需要处理该法律工作流时调用。']),
  '',
  '## 启动前必问',
  '- 这次输出要给谁看：内部法务、业务负责人、外部律师、对方、法院/仲裁机构、监管机构还是客户？',
  '- 适用法域、业务场景、交易/案件阶段、用户立场和需要解决的具体问题是什么？',
  '- 是否有硬期限、上线/签署/提交节点、必须保留的商业条件或不可触碰红线？',
  '- 已提供哪些材料，哪些材料尚未提供，哪些事实只能作为假设？',
  '- 期望输出是 Word 文书、审查意见、风险矩阵、谈判清单、整改路线图、邮件草稿还是汇报摘要？',
  '',
  '## 输入材料清单',
  renderBullets(inputs, ['用户提供业务目标、事实材料、适用法域、己方立场和输出用途。']),
  '',
  '## 缺失信息处理',
  '- 如果缺失信息会影响结论、风险等级或建议动作，先列为“待确认事项”。',
  '- 如果用户要求继续生成，必须在输出开头说明“基于目前材料”。',
  '- 不得为了让输出完整而补造合同条款、案件事实、法规依据、审批记录、时间节点或当事人立场。',
  '- 对期限、金额、主体、材料版本、适用法域、授权范围等关键字段，必须保留不确定性标记。',
].join('\n');

const renderChecklistReference = ({ name, inputs, workflow, checks, guardrails }) => [
  `# ${name}检查清单`,
  '',
  '## 输入核验',
  renderBullets(inputs, ['确认材料类型、适用法域、己方立场、业务目标、输出用途和必须保留的边界。', '缺少关键材料时先列待补充事项，不直接补写事实。']),
  '',
  '## 执行步骤',
  renderNumbered(workflow, ['确认目标和材料范围。', '逐项识别风险、缺口和待确认事实。', '按输出模式生成交付结果。']),
  '',
  '## 风险分级',
  '| 等级 | 判断标准 | 推荐动作 |',
  '| --- | --- | --- |',
  '| P0 / Red | 影响签署、交割、上线、核心权利、监管义务或重大责任 | 签署或执行前必须处理或升级 |',
  '| P1 / High | 风险明确但可通过条款、证据、流程或审批缓释 | 优先修改、谈判、补证或补流程 |',
  '| P2 / Medium | 影响执行便利性、成本、管理或后续争议 | 结合商业目标优化并留痕 |',
  '| P3 / Note | 信息缺口、低风险提示或需业务确认事项 | 标注待确认或常规跟进 |',
  '',
  ...(/合同|红线|审查/.test(name) ? [
    '## 合同审查专项维度',
    '| 维度 | 重点问题 |',
    '| --- | --- |',
    '| 文件关系 | 主协议、订单、附件、SLA、DPA、线上条款、补充协议的优先级是否清楚 |',
    '| 主体与授权 | 签署主体、关联方、授权代表、第三方受益人和转让限制是否一致 |',
    '| 商业条款 | 价款、税费、付款节点、验收、变更、续费、涨价和暂停服务是否可执行 |',
    '| 责任结构 | 违约责任、赔偿、责任上限、责任例外、间接损失排除和保险是否相互冲突 |',
    '| 数据与安全 | 客户数据、个人信息、子处理者、跨境、事故通知、删除返还和审计权是否完整 |',
    '| IP 与成果 | 背景 IP、交付成果、开源组件、侵权赔偿、反馈和数据训练授权是否清楚 |',
    '| 退出机制 | 终止权、终止后付款、迁移协助、数据导出、存续义务和过渡期是否足够 |',
    '| 争议与合规 | 管辖、适用法、禁令救济、反腐败、制裁、出口管制和行业监管是否可接受 |',
    '',
  ] : []),
  '## 复核纪律',
  renderBullets(checks, ['结论必须能追溯到用户材料或明确假设。', '输出必须同时给出风险影响和下一步动作。']),
  '',
  '## 边界',
  renderBullets(guardrails, ['不编造法律依据、案件事实、交易背景或用户未提供的材料。', '涉及重大法律后果时提示由执业律师复核。']),
].join('\n');

const renderOutputPatternsReference = ({ name, output }) => [
  `# ${name}输出模式`,
  '',
  '## 推荐输出结构',
  renderBullets(output, ['执行摘要。', '问题或风险矩阵。', '修改建议或替代文本。', '待确认事项和升级建议。']),
  '',
  '## 标准交付表',
  '| 项目 | 依据 | 风险等级 | 影响 | 建议动作 | 可复制文本 | 待确认事项 |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  '| 示例事项 | 条款、事实或材料位置 | P0/P1/P2/P3 | 具体后果 | 修改、补证、谈判、升级或接受 | 可直接插入或发送的文本 | 责任人或缺口 |',
  '',
  '## 写法要求',
  '- 结论句必须说明“基于目前材料”。',
  '- 风险描述必须写具体后果，不写空泛的“存在风险”。',
  '- 修改建议必须能执行，能落到条款、文件、流程、证据或审批动作。',
  '- 对外沟通语言和内部风险备注要分开写。',
  '',
  ...(/合同|红线|审查/.test(name) ? [
    '## 红线语言模式',
    '### 责任上限',
    '建议将责任上限限定为“过去 12 个月内已支付或应支付的费用总额”，并明确排除间接损失、利润损失、商誉损失和数据损失；如需例外，应限于保密、数据安全、知识产权侵权赔偿、欺诈或故意不当行为。',
    '',
    '### 赔偿程序',
    '建议增加赔偿通知、抗辩控制、和解同意、配合义务和减损义务。未经被赔偿方事先书面同意，赔偿方不得达成包含承认责任、非金钱义务或影响被赔偿方权利的和解。',
    '',
    '### 数据删除与导出',
    '建议明确服务终止后供应商应在合理期限内提供客户数据导出，并在迁移期结束后按客户指示删除或返还数据；法律要求保留的备份数据应继续受保密和安全义务约束。',
    '',
    '### 单方变更',
    '建议限制供应商对服务、价格、安全措施或线上条款的单方变更；如变更实质降低服务、扩大客户义务或影响合规，应提前通知并给予客户终止权。',
    '',
    '## 谈判口径',
    '| 场景 | 对外理由 | fallback |',
    '| --- | --- | --- |',
    '| 对方拒绝责任上限 | 责任结构需要与合同金额和保险安排匹配，避免无限责任造成审批障碍 | 设置超级 cap 或仅对少数高风险例外不适用 cap |',
    '| 对方要求单方停服 | 争议期间停服会直接影响业务连续性 | 限定为重大安全风险、违法使用或长期逾期付款，并要求事先通知 |',
    '| 对方拒绝数据导出 | 退出迁移是客户数据控制和业务连续性的基本要求 | 缩短协助期或收取合理专业服务费 |',
    '| 对方要求宽泛 IP 赔偿 | 赔偿应限于第三方正式索赔并排除客户材料、修改和组合使用导致的侵权 | 增加排除项和赔偿程序控制 |',
    '',
  ] : []),
  '## 禁止输出',
  '- 不输出只有原则、没有动作的建议。',
  '- 不把业务偏好包装成确定法律结论。',
  '- 不把未提供材料当作已经审阅。',
].join('\n');

const renderQualityGatesReference = ({ name, checks, guardrails }) => [
  `# ${name}质量门槛`,
  '',
  '## 保存前质量门槛',
  '- SKILL.md 必须能让模型知道什么时候触发、要问什么、按什么步骤处理、输出什么、哪些不能做。',
  '- references/checklist.md 必须足够具体，不能只写“识别风险、给出建议”。',
  '- references/output-patterns.md 必须包含稳定表格字段、可复制文本模式和禁止输出。',
  '- 所有重大建议必须有依据、影响、动作、责任人或待确认事项中的至少三项。',
  '- 输出必须区分事实、假设、判断、建议和待复核事项。',
  '',
  '## 复核清单',
  renderBullets(checks, ['结论必须能追溯到用户材料或明确假设。', '输出必须同时给出风险影响和下一步动作。']),
  '',
  '## 升级规则',
  '- 涉及诉讼期限、监管处罚、数据出境、金融医疗、未成年人、劳动解除、重大交易交割或公开披露时，提示专项律师复核。',
  '- 材料冲突、事实缺失、用户要求确定结论但依据不足时，先列风险和待确认事项。',
  '- 用户要求规避监管、伪造材料、删除证据、误导对方或法院/监管机构时，拒绝协助并转为合规建议。',
  '',
  '## 禁止事项',
  renderBullets(guardrails, ['不编造法律依据、案件事实、交易背景或用户未提供的材料。', '涉及重大法律后果时提示由执业律师复核。']),
].join('\n');

const renderExampleInput = ({ name }) => [
  `# ${name}示例输入`,
  '',
  '以下仅作为输入结构示例，真实使用时必须替换为用户自己的材料。',
  '',
  '```text',
  '任务目标：请基于以下材料生成结构化法律工作流输出。',
  '适用法域：待确认。',
  '用户立场：待确认。',
  '输出用途：内部审查 / 对外沟通 / Word 文书 / 风险矩阵。',
  '已提供材料：',
  '1. 材料 A：……',
  '2. 材料 B：……',
  '关键限制：不得编造未提供事实；缺失信息列为待确认。',
  '```',
].join('\n');

const renderExampleOutput = ({ name }) => [
  `# ${name}示例输出骨架`,
  '',
  '## 基于目前材料的初步结论',
  '- 结论：……',
  '- 关键假设：……',
  '- 需要复核：……',
  '',
  '## 风险 / 问题矩阵',
  '| 项目 | 材料依据 | 风险等级 | 影响 | 建议动作 | 待确认事项 |',
  '| --- | --- | --- | --- | --- | --- |',
  '| 示例事项 | 材料位置或事实来源 | P0/P1/P2/P3 | 具体后果 | 可执行动作 | 责任人或缺口 |',
  '',
  '## 下一步',
  '- 补充材料：……',
  '- 律师复核：……',
  '- 对外沟通：……',
].join('\n');

const renderReferenceForPath = (path, structured) => {
  if (path === 'references/intake.md') return renderIntakeReference(structured);
  if (path === 'references/checklist.md') return renderChecklistReference(structured);
  if (path === 'references/output-patterns.md') return renderOutputPatternsReference(structured);
  if (path === 'references/quality-gates.md') return renderQualityGatesReference(structured);
  if (path === 'examples/example-input.md') return renderExampleInput(structured);
  if (path === 'examples/example-output.md') return renderExampleOutput(structured);
  return renderChecklistReference(structured);
};

const normalizePathList = (paths) => {
  const seen = new Set();
  return paths
    .filter((path) => typeof path === 'string' && path.trim())
    .map((path) => normalizePath(path, 1))
    .filter((path) => path !== 'SKILL.md' && isAllowedGeneratedPath(path))
    .filter((path) => {
      if (seen.has(path)) return false;
      seen.add(path);
      return true;
    });
};

const hasPromptSignal = (brief, answers, pattern) => [
  brief,
  answers?.scenario,
  answers?.source,
  answers?.output,
  answers?.scope,
].filter(Boolean).some((value) => pattern.test(String(value)));

const inferSupportPaths = (structured, brief = '', answers = {}) => {
  const text = [brief, structured.name, structured.category, ...structured.tags].join('\n');
  const paths = [];

  const wantsReferences = hasPromptSignal(brief, answers, /复杂|详细|完整|团队|共享|playbook|知识库|审查|合规|法规|诉讼|证据|合同|对比|差距|上线|隐私|监管|检索|尽调|并购|劳动|知识产权|整改|清单|矩阵|报告/i);
  const wantsOutputTemplate = hasPromptSignal(brief, answers, /Word|文书|报告|矩阵|表格|模板|清单|可复制|邮件|红线|路线图|时间线|目录|摘要/i);
  const wantsIntake = hasPromptSignal(brief, answers, /信息不足|材料|上传|粘贴|团队|playbook|知识库|诉讼|证据|尽调|产品|上线|法规|合规/i);
  const wantsQualityGate = hasPromptSignal(brief, answers, /高风险|监管|数据|隐私|金融|医疗|未成年人|劳动|并购|上线|法规|合规|公开披露|质量|复核/i);
  const wantsExamples = hasPromptSignal(brief, answers, /示例|example|样例|样稿|模板|格式样式/i);

  if (wantsIntake) paths.push('references/intake.md');
  if (wantsReferences || /诉讼|证据|合同|法规|合规|上线|审查|检索|尽调|并购|劳动|知识产权/.test(text)) {
    paths.push('references/checklist.md');
  }
  if (wantsOutputTemplate) paths.push('references/output-patterns.md');
  if (wantsQualityGate && paths.length >= 2) paths.push('references/quality-gates.md');
  if (wantsExamples && paths.length) {
    paths.push('examples/example-input.md', 'examples/example-output.md');
  }

  if (!paths.length && (structured.workflow.length > 4 || structured.checks.length > 3 || structured.output.length > 2)) {
    paths.push('references/checklist.md');
  }

  return normalizePathList(paths);
};

const contractReviewDraft = (answers = {}) => ({
  id: 'contract-review-redline',
  name: '合同审查与红线生成',
  description: 'Review commercial contracts and generate risk matrices, redline language, fallback positions, and negotiation reasons from a specified party perspective.',
  category: '商事合同',
  tags: ['合同审查', '红线', '风险矩阵', '谈判'],
  scope: answers.scope === '团队共享' ? 'team' : 'personal',
  triggers: [
    '用户上传或粘贴合同、订单、附件、DPA、SLA、报价单、披露函或补充协议并要求审查。',
    '用户需要按客户、供应商、买方、卖方、投资方或融资方立场提出红线修改。',
    '用户需要把审查意见转成风险矩阵、谈判清单或给对方律师的修改理由。',
  ],
  inputs: [
    '合同全文及附件，包含主协议、订单、SLA、DPA、报价单、披露函或补充协议。',
    '用户立场、交易背景、适用法域、交易金额、行业、谈判底线和内部 playbook。',
    '输出用途：中文审查意见、对外红线理由、内部风险 memo 或逐条替代条款。',
  ],
  workflow: [
    '确认合同类型、用户立场、适用法域、交易金额、关键商业目标和缺失材料。',
    '建立文件地图，标明主协议、订单、附件、线上条款和补充协议之间的优先级。',
    '逐条审查主体、付款、交付/验收、变更、IP、数据、保密、违约、赔偿、责任限制、终止、争议解决和合规条款。',
    '按用户立场判断条款是否偏离市场标准或团队 playbook，并标注 P0/P1/P2/P3 风险。',
    '对高/中风险点输出问题、影响、建议立场、fallback、可插入替代条款和对外修改理由。',
    '列出待补充事实、必须升级律师或业务负责人决策的事项，以及可接受但需留痕的风险。',
  ],
  output: [
    '执行摘要：可签、可谈或不建议签的初步结论和前三大风险。',
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
});

const skillProfiles = [
  {
    key: 'litigation-timeline',
    pattern: /诉讼.*时间线|时间线.*诉讼|案件时间线|庭审时间轴|证据时间轴|程序节点|举证期限|开庭|上诉|执行/i,
    id: 'litigation-timeline-organizer',
    name: '诉讼时间线整理助手',
    category: '诉讼与证据',
    tags: ['诉讼时间线', '案件管理', '证据整理', '程序节点'],
    triggers: [
      '用户提供案件事实、聊天记录、合同履行过程、诉讼节点或证据材料，需要整理成可用于诉讼或律师沟通的时间线。',
      '用户需要把分散事实归并为事件节点、证据来源、法律意义、待补证事项和程序风险。',
      '用户需要输出可复制到 Word 的案件时间线、证据目录或庭前准备清单。',
    ],
    inputs: [
      '案件事实叙述、时间节点、当事人身份、争议焦点、程序阶段和目标用途。',
      '证据材料清单、聊天记录、邮件、合同、付款记录、通知函、送达凭证、裁判文书或执行材料。',
      '适用法域、法院或仲裁机构、已有期限、律师或业务团队关注的重点问题。',
    ],
    workflow: [
      '先识别案件类型、程序阶段、当事人关系、诉讼目标和时间线用途。',
      '抽取所有日期、期间、事件、行为主体、证据来源和不确定时间点，缺失日期用待确认标记。',
      '按自然时间、程序时间和争议焦点三种视角整理节点，区分事实发生、证据形成、通知送达和程序期限。',
      '标记每个节点的法律意义、证据强度、证明对象、对举证责任或诉讼请求的影响。',
      '识别时间冲突、证据断点、时效/除斥期间/举证期限/上诉期限/执行期限等高风险节点。',
      '输出结构化时间线、证据缺口、待确认问题、下一步补证或程序动作。',
    ],
    output: [
      '案件时间线表：日期、事件、主体、证据、证明对象、法律意义、风险等级、待确认事项。',
      '程序节点清单：起诉、立案、送达、举证、开庭、判决、上诉、执行等节点及期限风险。',
      '证据缺口和补证建议：每个缺口对应证明目的、现有材料和下一步动作。',
      'Word 文书初稿段落：事实经过、争议焦点时间线、证据说明和待律师复核事项。',
    ],
    checks: [
      '不得把模糊日期改写成确定日期；必须保留“约”“待确认”“未提供”的不确定性。',
      '每个关键节点必须能追溯到用户材料、证据编号或明确假设。',
      '必须区分事实发生时间、证据形成时间、知悉时间、通知送达时间和程序期限。',
      '必须提示可能影响时效、上诉、举证、执行或管辖的关键日期。',
      '不得将时间线整理结果包装为确定胜诉判断。',
    ],
    guardrails: [
      '不替用户预测未发生的程序日期，不编造法院、案号、送达时间或证据内容。',
      '涉及诉讼时效、上诉期限、举证期限、执行期限等必须提示律师复核。',
      '无法确认的事实必须进入待确认事项，不得直接用于结论。',
    ],
  },
  {
    key: 'product-launch-review',
    pattern: /产品上线|功能上线|上线审查|合规审查|隐私政策|用户协议|数据处理|个人信息|算法|AI功能|广告合规/i,
    id: 'product-launch-legal-review',
    name: '产品上线法律审查',
    category: '产品合规',
    tags: ['产品上线', '合规审查', '数据合规', '用户协议'],
    triggers: [
      '用户提供产品功能、交互、文案、协议、隐私政策或数据处理流程，需要上线前法律合规审查。',
      '用户需要识别产品上线前的隐私、消费者权益、广告宣传、知识产权、平台规则或行业监管风险。',
      '用户需要输出面向产品、研发、运营或管理层的上线审查意见和整改清单。',
    ],
    inputs: [
      '产品功能说明、用户路径、目标用户、上线范围、目标市场、收集使用的数据类型和第三方 SDK。',
      '用户协议、隐私政策、弹窗文案、营销文案、客服规则、后台配置、权限申请和数据流图。',
      '业务负责人关注点、上线时间、必须上线范围、可调整范围、适用法域和行业监管要求。',
    ],
    workflow: [
      '确认产品形态、目标用户、适用法域、上线范围、数据处理活动和业务不可变条件。',
      '建立功能到法律问题的映射，覆盖数据合规、消费者权益、广告宣传、未成年人、知识产权、平台规则和行业监管。',
      '检查协议、隐私政策、授权弹窗、默认勾选、撤回路径、留痕、第三方共享和跨境传输。',
      '按 P0/P1/P2/P3 标记上线阻断、上线前必须整改、可上线后优化和常规提示。',
      '输出整改动作，明确责任团队、材料位置、建议文案、验证方式和上线门槛。',
      '列出需律师、DPO、安全、产品负责人或管理层升级决策的事项。',
    ],
    output: [
      '上线法律审查意见：结论、上线前必须处理项、可延期处理项和已知假设。',
      '风险矩阵：功能/材料位置、法律问题、依据、风险等级、影响、整改建议、责任人、验证方式。',
      '协议/隐私/弹窗/文案修改建议和可复制文本。',
      '上线前 gate checklist：P0/P1 完成状态、留痕材料和审批建议。',
    ],
    checks: [
      '每个上线阻断项必须对应具体功能、材料位置、法律风险和可执行整改动作。',
      '必须区分法律风险、产品体验风险、安全风险、运营风险和商业接受风险。',
      '不得把未提供的隐私政策、协议条款或数据流当作已经审阅。',
      '对数据出境、敏感个人信息、未成年人、金融医疗等高风险场景必须提示专项复核。',
    ],
    guardrails: [
      '不编造法规条文、监管口径或平台政策；不确定依据必须写为待核验。',
      '不承诺产品一定可上线；只能给出基于已提供材料的审查意见和建议动作。',
      '不得以法律审查名义替业务决定是否接受剩余风险。',
    ],
  },
  {
    key: 'regulatory-gap',
    pattern: /法规差距|合规差距|gap analysis|差距分析|监管要求|制度对标|规则对标|整改路线/i,
    id: 'regulatory-gap-analysis',
    name: '法规差距分析助手',
    category: '合规治理',
    tags: ['法规差距', '合规整改', '制度对标', '风险分级'],
    triggers: [
      '用户提供新规、监管要求、内部制度、流程或现状描述，需要做差距分析。',
      '用户需要把法规义务拆成可执行整改项、责任部门、证据材料和完成标准。',
      '用户需要输出合规差距报告、整改路线图或管理层汇报清单。',
    ],
    inputs: [
      '目标法规、监管文件、政策条文、适用主体、适用业务、现行制度和流程现状。',
      '现有材料：制度、SOP、系统截图、审批记录、培训记录、合同模板、审计发现或访谈纪要。',
      '时间要求、责任部门、整改预算、可接受风险和已知监管关注点。',
    ],
    workflow: [
      '确认适用主体、业务范围、法域、法规层级、施行时间和整改目标。',
      '将法规或监管要求拆解为义务清单，区分硬性义务、倡导要求、证明责任和留痕要求。',
      '逐项对照现状材料，标记满足、部分满足、不满足、无法判断和不适用。',
      '按监管处罚、业务影响、整改复杂度和期限紧迫性确定优先级。',
      '生成整改动作、责任部门、证据材料、完成标准、时间计划和复核方式。',
      '输出管理层摘要、差距矩阵、整改路线图和待确认事项。',
    ],
    output: [
      '法规义务拆解表：条款/要求、义务内容、适用性、现状、差距、风险等级、整改动作。',
      '整改路线图：优先级、责任部门、完成标准、所需证据、计划时间和依赖事项。',
      '管理层摘要：重大差距、监管后果、资源需求和决策点。',
      '待确认清单：适用范围、材料缺口、业务例外和需要外部律师确认的问题。',
    ],
    checks: [
      '必须区分“法规要求本身”和“内部整改建议”，不得把建议写成法律硬性义务。',
      '每个差距必须对应具体条款、现状材料或明确的信息缺口。',
      '必须标记不适用或无法判断的项目，不能强行套用所有规则。',
      '整改建议必须有责任部门、交付物、完成标准或验证方法。',
    ],
    guardrails: [
      '不编造法规条款、监管处罚或内部制度现状。',
      '不把未审阅材料当作已符合要求；不确定时必须写为待核验。',
      '跨境、金融、医疗、未成年人、数据安全等高风险主题需提示专项复核。',
    ],
  },
  {
    key: 'contract-comparison',
    pattern: /合同.*(对比|比较|比对|差异)|(?:对比|比较|比对).*合同|版本差异|条款差异/i,
    id: 'contract-comparison-review',
    name: '合同版本差异审查',
    category: '商事合同',
    tags: ['合同对比', '版本差异', '红线审查', '谈判'],
    triggers: [
      '用户提供两个或多个合同版本、红线稿、对方修改稿或模板与实际稿，需要识别差异和法律影响。',
      '用户需要把条款变化转成风险矩阵、接受/拒绝建议、fallback 和对外谈判理由。',
      '用户需要输出 Word 审查意见、邮件回复草稿或谈判清单。',
    ],
    inputs: [
      '基准版本、对方版本、红线稿、附件、订单、DPA、SLA 或模板条款。',
      '用户立场、交易背景、适用法域、商业底线、必须保留条款和可让步范围。',
      '输出用途：内部审查、对外回复、谈判准备或审批材料。',
    ],
    workflow: [
      '确认基准版本、对比版本、文件优先级、用户立场和审查目标。',
      '逐条识别新增、删除、修改、移动、定义变化和交叉引用变化。',
      '判断每项差异对权利义务、责任结构、付款交付、数据安全、IP、终止和争议解决的影响。',
      '按 P0/P1/P2/P3 标注风险和谈判优先级，区分法律风险、商业风险和操作风险。',
      '为重要差异生成接受、拒绝、修改或 fallback 建议，并提供可复制条款或对外理由。',
      '输出差异矩阵、重点风险摘要和待确认事项。',
    ],
    output: [
      '合同差异矩阵：条款位置、原版本、对方版本、差异类型、影响、风险等级、建议动作。',
      '重点风险摘要和谈判优先级。',
      '可复制的替代条款、fallback 和对外沟通理由。',
      '待确认事项和需升级审批的问题。',
    ],
    checks: [
      '不得只列文字变化，必须说明法律或业务影响。',
      '必须检查定义、交叉引用、附件优先级和责任上限例外是否因版本差异失配。',
      '每个重大差异必须对应建议动作和可接受 fallback。',
    ],
    guardrails: [
      '不编造未提供版本中的条款；缺少某一版本时必须说明无法完整对比。',
      '不把业务偏好包装成确定法律结论。',
    ],
  },
  {
    key: 'legal-research',
    pattern: /法律检索|法规检索|类案|案例检索|法律研究|检索报告|裁判观点|法条/i,
    id: 'legal-research-reporting',
    name: '法律检索报告生成',
    category: '法律研究',
    tags: ['法律检索', '类案检索', '法规研究', '报告生成'],
    triggers: [
      '用户提供法律问题、事实背景或争议焦点，需要形成检索思路、检索报告或类案分析。',
      '用户需要把法规、案例、监管口径或裁判观点整理为可复用的法律研究交付。',
    ],
    inputs: [
      '法律问题、事实背景、法域、时间范围、行业背景、争议焦点和输出用途。',
      '已找到的法规、案例、文章、监管材料、关键词或知识库片段。',
      '用户立场、待证明结论、反方观点和需要排除的无关范围。',
    ],
    workflow: [
      '拆解法律问题，明确法域、主体、事实要件、时间范围和检索边界。',
      '设计关键词、同义词、法条路径、案例路径和监管路径。',
      '整理法规层级、案例裁判要旨、适用条件、相反观点和未决问题。',
      '评估每条依据的权威性、时效性、适用性和事实相似度。',
      '输出结论倾向、依据表、类案比较、风险提示和待补检索事项。',
    ],
    output: [
      '法律检索报告：问题、结论倾向、依据、分析、反方观点、待确认事项。',
      '法规/案例依据表：名称、来源、要旨、适用条件、支持力度、限制。',
      '类案比较表：事实相似点、差异点、裁判结果、可借鉴观点。',
    ],
    checks: [
      '必须区分已验证来源、用户提供材料和需要进一步检索的线索。',
      '不得编造案例案号、法条、法院、裁判日期或监管文件。',
      '结论必须说明适用前提和不确定性。',
    ],
    guardrails: [
      '不把检索摘要当作正式法律意见。',
      '缺少来源时必须提示需要补充检索，不得制造引用。',
    ],
  },
];

const defaultSkillProfile = {
  id: 'custom-legal-workflow',
  name: '自建法律工作流',
  category: '自建技能',
  tags: ['法律工作流', '自建技能', '结构化输出'],
  triggers: [
    '用户需要把某类法律工作流固化为可重复调用的技能。',
    '用户提供业务目标、材料文本、适用法域或输出要求，需要生成稳定的处理流程和交付格式。',
  ],
  inputs: [
    '业务目标、事实材料、适用法域、己方立场、输出用途、时间要求和关键限制。',
    '已有模板、团队 playbook、知识库片段、示例输出或必须遵守的格式要求。',
  ],
  workflow: [
    '确认任务类型、适用法域、材料范围、用户立场、输出对象和不可变限制。',
    '识别缺失信息、冲突材料、待确认假设和需要人工复核的事项。',
    '将工作流拆成输入核验、问题识别、规则应用、结构化输出、质量检查和升级处理。',
    '输出可复制的文本、表格、风险矩阵、行动清单或文书段落，并标明依据和边界。',
  ],
  output: [
    '结构化结论、风险提示、行动建议、待确认事项和可复制文本。',
    '适合粘贴到 Word、邮件、审查意见或内部审批材料的稳定格式。',
  ],
  checks: [
    '每个关键结论必须能追溯到用户材料、明确假设或已给定规则。',
    '必须区分确定事实、合理推断、待确认事项和需要律师复核的问题。',
    '建议必须可执行，能落到条款、文件、流程、证据、审批或责任人。',
  ],
  guardrails: [
    '不编造事实、法律依据、材料内容、团队口径或外部来源。',
    '重大法律后果、监管问题、高风险结论或跨法域问题必须提示人工复核。',
  ],
};

const detectSkillProfile = (brief, answers = {}) => {
  const source = [
    brief,
    answers.scenario,
    answers.source,
    answers.output,
    answers.scope,
  ].filter(Boolean).join('\n');

  return skillProfiles.find((profile) => profile.pattern.test(source)) || defaultSkillProfile;
};

const createStructuredDraft = (draft, brief, answers = {}) => {
  const isContractComparison = /合同.*(对比|比较|比对|差异)|(?:对比|比较|比对).*合同/i.test(brief);
  const isContractReview = !isContractComparison && /合同.*(红线|审查)|红线|MSA|SaaS|采购|服务|并购|投资/i.test(brief);
  if (isContractReview) {
    return contractReviewDraft(answers);
  }

  const profile = detectSkillProfile(brief, answers);
  const base = {
    id: slugify(draft?.id || profile.id || draft?.name || brief || 'custom-legal-skill'),
    name: toSentence(draft?.name, profile.name || brief || '自建法律技能'),
    description: toSentence(draft?.description, `Handle ${profile.name || 'a legal workflow'} with structured intake, checks, outputs, quality gates, and guardrails.`),
    category: toSentence(draft?.category, profile.category || '自建技能'),
    tags: normalizeTags(draft?.tags).length ? normalizeTags(draft?.tags) : profile.tags,
    scope: answers.scope === '团队共享' || draft?.scope === 'team' ? 'team' : 'personal',
    triggers: normalizeList([answers.scenario], profile.triggers),
    inputs: normalizeList([answers.source], profile.inputs),
    workflow: profile.workflow,
    output: normalizeList([answers.output], profile.output),
    checks: profile.checks,
    guardrails: profile.guardrails,
  };

  const name = toSentence(draft?.name, base.name);
  return {
    ...base,
    id: slugify(draft?.id || base.id || name),
    name,
    description: toSentence(draft?.description, base.description),
    category: toSentence(draft?.category, base.category),
    tags: normalizeTags(draft?.tags).length ? normalizeTags(draft?.tags) : base.tags,
    scope: draft?.scope === 'team' || answers.scope === '团队共享' ? 'team' : base.scope,
    triggers: normalizeList(draft?.triggers, base.triggers),
    inputs: normalizeList(draft?.inputs, base.inputs),
    workflow: normalizeList(draft?.workflow, base.workflow),
    output: normalizeList(draft?.output, base.output),
    checks: normalizeList(draft?.checks, base.checks),
    guardrails: normalizeList(draft?.guardrails, base.guardrails),
  };
};

const normalizePath = (path, index) => {
  const raw = typeof path === 'string' && path.trim() ? path.trim() : index === 0 ? 'SKILL.md' : `references/reference-${index}.md`;
  return raw
    .replace(/^\.\/+/, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
};

const isAllowedGeneratedPath = (path) => {
  if (path === 'SKILL.md') return true;
  if (path.startsWith('references/') && path.endsWith('.md')) return true;
  if (path.startsWith('examples/') && path.endsWith('.md')) return true;
  if (path === 'agents/openai.yaml') return true;
  if (path.startsWith('scripts/')) return true;
  if (path.startsWith('assets/')) return true;
  return false;
};

const shouldReplaceSkillMarkdown = (content, id) => {
  const text = String(content || '').trim();
  if (!text.startsWith('---')) return true;
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return true;
  if (!new RegExp(`(^|\\n)name:\\s*${id}(\\n|$)`).test(frontmatter[1])) return true;
  if (/metadata:|short-description:|allowed-tools:|license:/i.test(frontmatter[1])) return true;
  return stripSkillFrontmatter(text).length < 500;
};

const shouldReplaceReferenceMarkdown = (content, requiredPatterns = []) => {
  const text = String(content || '').trim();
  if (text.length < 500) return true;
  return requiredPatterns.some((pattern) => !pattern.test(text));
};

const normalizeCreatedSkill = (draft, brief = '', answers = {}) => {
  const structured = createStructuredDraft(draft, brief, answers);
  const files = Array.isArray(draft?.files) ? draft.files : [];
  const fileMap = new Map();

  files.forEach((file, index) => {
    const path = normalizePath(file?.path, index);
    const content = typeof file?.content === 'string' ? file.content.trim() : '';
    if (!content || !isAllowedGeneratedPath(path)) return;
    fileMap.set(path, content);
  });

  if (structured.id === 'contract-review-redline') {
    fileMap.clear();
  }

  const generatedSupportPaths = Array.from(fileMap.keys()).filter((path) => path !== 'SKILL.md');
  const inferredSupportPaths = inferSupportPaths(structured, brief, answers);
  const supportPaths = normalizePathList([
    ...generatedSupportPaths,
    ...(!generatedSupportPaths.length ? inferredSupportPaths : inferredSupportPaths.filter((path) => fileMap.has(path))),
  ]);

  supportPaths.forEach((path) => {
    const content = fileMap.get(path);
    const requiredPatterns = path === 'references/intake.md'
      ? [/启动|输入|材料/, /缺失|待确认|澄清/]
      : path === 'references/checklist.md'
        ? [/风险|等级|优先级|清单|步骤/, /复核|检查|核验|边界/]
        : path === 'references/output-patterns.md'
          ? [/输出|交付|表格|格式/, /禁止|不得|不要|待确认/]
          : path === 'references/quality-gates.md'
            ? [/质量|门槛|复核/, /升级|禁止|不得/]
            : [];

    if (!content || (requiredPatterns.length && shouldReplaceReferenceMarkdown(content, requiredPatterns))) {
      fileMap.set(path, renderReferenceForPath(path, structured));
    }
  });

  Array.from(fileMap.keys()).forEach((path) => {
    if (path !== 'SKILL.md' && !supportPaths.includes(path)) {
      fileMap.delete(path);
    }
  });

  const skillContent = fileMap.get('SKILL.md');
  if (!skillContent || shouldReplaceSkillMarkdown(skillContent, structured.id)) {
    fileMap.set('SKILL.md', renderSkillMarkdown(structured, supportPaths));
  }

  const sortOrder = (path) => {
    if (path === 'SKILL.md') return 0;
    const explicitOrder = SUPPORT_FILE_ORDER.indexOf(path);
    if (explicitOrder >= 0) return explicitOrder + 1;
    if (path.startsWith('references/')) return 20;
    if (path.startsWith('examples/')) return 30;
    if (path.startsWith('agents/')) return 34;
    if (path.startsWith('scripts/')) return 35;
    return 40;
  };

  const normalizedFiles = Array.from(fileMap.entries())
    .sort(([a], [b]) => sortOrder(a) - sortOrder(b) || a.localeCompare(b))
    .map(([path, content], index) => ({
      id: `${structured.id}-${path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || index}`,
      name: path.split('/').pop() || path,
      path,
      type: normalizeFileType(path),
      content,
    }));

  return {
    id: structured.id,
    name: structured.name,
    description: structured.description,
    category: structured.category,
    routeName: 'chat',
    tags: structured.tags,
    files: normalizedFiles,
    source: 'custom',
    scope: structured.scope,
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

const extractTaggedSkillJson = (content) => {
  const tagged = String(content || '').match(/<skill_json>\s*([\s\S]*?)\s*<\/skill_json>/i);
  return extractJsonObject(tagged?.[1] || content);
};

const isThinkingEnabled = (options = {}) => options?.thinkingMode === 'thinking';

const buildUpstreamBody = ({
  model,
  messages,
  options = {},
  stream = false,
  responseFormat = null,
}) => {
  const thinkingEnabled = isThinkingEnabled(options);
  return {
    model,
    messages,
    max_tokens: stream ? 20000 : 12000,
    stream,
    thinking: {
      type: thinkingEnabled ? 'enabled' : 'disabled',
    },
    ...(thinkingEnabled
      ? { reasoning_effort: 'high' }
      : { temperature: 0.2 }),
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };
};

const readDeepSeekStreamFrame = (frame) => {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!data) return { done: false, content: '', model: '' };
  if (data === '[DONE]') return { done: true, content: '', model: '' };

  const payload = JSON.parse(data);
  if (payload.error) {
    throw new Error(payload.error.message || 'skill-creator 创建失败');
  }

  return {
    done: false,
    reasoningContent: payload.choices?.map((choice) => choice.delta?.reasoning_content || '').join('') || '',
    content: payload.choices?.map((choice) => choice.delta?.content || '').join('') || '',
    model: payload.model || '',
  };
};

const forwardSkillCreatorStream = async (upstreamResponse, response, model, brief, answers) => {
  if (!upstreamResponse.body) {
    throw new Error('skill-creator 未返回可读取的流');
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
  let rawOutput = '';
  let content = '';
  let streamModel = model;
  let isDone = false;

  const handleFrame = async (frame) => {
    const payload = readDeepSeekStreamFrame(frame);
    if (payload.done) {
      isDone = true;
      return;
    }

    if (payload.model && payload.model !== streamModel) {
      streamModel = payload.model;
      await sendStreamEvent(response, 'meta', { model: streamModel });
    }

    if (payload.reasoningContent) {
      await sendStreamEvent(response, 'thinking', { content: payload.reasoningContent });
    }

    if (payload.content) {
      rawOutput += payload.content;
      content += payload.content;
      await sendContentStream(response, payload.content);
    }
  };

  while (!isDone) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (frame) {
        await handleFrame(frame);
        if (isDone) break;
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n');
  if (!isDone && buffer.trim()) {
    await handleFrame(buffer.trim());
  }

  await sendStreamEvent(response, 'validation', {
    status: 'checking',
    message: '正在校验技能完整度，解析生成物结构。',
  });

  let parsed = null;
  try {
    parsed = extractTaggedSkillJson(content);
  } catch {
    parsed = null;
  }

  const skill = normalizeCreatedSkill(parsed || buildFallbackDraft(brief, answers || {}), brief, answers || {});
  const activeSkill = {
    ...skill,
    status: 'active',
  };
  const modelVisibleContent = rawOutput || content || renderGeneratedDraftAnswer(activeSkill);

  if (!rawOutput && !content) {
    await sendContentStream(response, modelVisibleContent);
  }

  await sendStreamEvent(response, 'skill', {
    skill,
    model: streamModel,
    fallbackUsed: !parsed,
    answerContent: modelVisibleContent,
  });
  await sendStreamEvent(response, 'done', {});
  response.end();
};

const buildFallbackDraft = (brief, answers = {}) => {
  const isContractComparison = /合同.*(对比|比较|比对|差异)|(?:对比|比较|比对).*合同/i.test(brief);
  const isContractReview = !isContractComparison && /合同.*(红线|审查)|红线|MSA|SaaS|采购|服务|并购|投资/i.test(brief);

  if (isContractReview) {
    return contractReviewDraft(answers);
  }

  const profile = detectSkillProfile(brief, answers);
  return {
    id: profile.id,
    name: profile.name,
    description: brief || `Handle ${profile.name} with structured intake, analysis, output, quality checks, and legal guardrails.`,
    category: profile.category,
    tags: profile.tags,
    scope: answers.scope === '团队共享' ? 'team' : 'personal',
    triggers: normalizeList([answers.scenario], profile.triggers),
    inputs: normalizeList([answers.source], profile.inputs),
    workflow: profile.workflow,
    output: normalizeList([answers.output], profile.output),
    checks: profile.checks,
    guardrails: profile.guardrails,
  };
};

const skillCreatorRules = [
  '你是“法律版”产品的真实 skill-creator，不是简单模板填充器。',
  '目标：把用户的一句或多句需求，扩展成可在法律工作中反复调用的高质量技能包。',
  '你必须根据需求识别法律工作类型：合同审查/对比/起草、诉讼时间线、证据整理、法规差距、产品上线合规、数据隐私、劳动用工、知识产权、公司治理、投融资并购、法律检索、文书起草、谈判准备、整改路线图等。',
  '如果信息不足，不要编造业务事实；把缺失信息写进 intake、checks、guardrails 和待确认规则。',
  'skill_json 必须是 JSON object，字段：id,name,description,category,tags,scope,triggers,inputs,workflow,output,checks,guardrails,files。',
  'id 必须是 lowercase hyphen-case，长度小于 64；name 用中文展示名；description 用英文或中英混合说明触发场景，长度小于 1024。',
  'files 必须至少包含 SKILL.md；其他文件全部按需生成，不能为了凑数量创建占位文件。',
  '简单技能优先单文件 SKILL.md；中等复杂度可以增加 1-2 个 references；复杂、高风险、格式严格或团队 playbook 型技能才增加更多 references/examples/scripts/assets。',
  'SKILL.md 必须以 YAML frontmatter 开头，且 frontmatter 只能包含 name 和 description；name 必须等于 id。',
  'SKILL.md 保持入口级说明：使用场景、输入要求、工作流、输出要求、质量检查、边界规则、需要时读取。',
  'references/ 只在 SKILL.md 会过长、需要详细清单/输出模板/领域规则时生成；文件要聚焦，且必须在 SKILL.md 中说明何时读取。',
  '常用 references 命名：references/checklist.md 用于详细检查清单；references/output-patterns.md 用于稳定输出格式；references/intake.md 用于复杂材料收集；references/quality-gates.md 用于高风险质量门槛。',
  '在 markdown 文件内容内部，如果要展示 Markdown 输出结构、标题、列表或表格，直接写成可渲染的 Markdown；不要再额外用 ```markdown 把整段模板包起来，除非确实是在展示源码示例。',
  'examples/ 只在用户要求样例，或输出格式非常依赖示例时生成；短示例可以直接写在 SKILL.md 中。',
  'scripts/ 只在需要确定性解析、校验、格式转换或重复执行代码时生成；assets/ 只在有模板、图片、静态资源时生成。',
  'agents/openai.yaml 只在用户明确要求导出/安装到 Codex 或 OpenAI Skills 时生成；普通法律版技能不要默认生成。',
  '如果用户需求中包含“关联底稿”“作为底稿”“知识库文件”“关联模板”或“使用这个模板”，必须把这些资产理解为创建技能时的参考输入：底稿/知识库应反映到输入要求、intake 或 checklist；模板应反映到输出结构、字段约束或 output-patterns。',
  '关联模板只是创建时的格式参考，不要把技能重新硬绑定到模板库；关联底稿只是运行时材料类型示例，不要编造文件全文中不存在的事实。',
  'content 必须具体到该技能：至少写出可执行检查维度、材料字段、风险分级、输出表头、待确认规则，不能只写“识别材料和目标”。',
  '除非用户明确需要确定性脚本或资产，否则不要生成 scripts/、assets/；不要生成 README.md、安装说明、CHANGELOG 或迁移来源说明。',
  '不得编造具体案件事实、合同条款、法规来源、法院案号、监管口径或内部制度；不确定内容写成待确认规则。',
];

const buildUserMessage = (brief, answers) => [
  `用户需求：${brief}`,
  `工作场景：${answers?.scenario || '未说明'}`,
  `输入来源：${answers?.source || '未说明'}`,
  `期望输出：${answers?.output || '未说明'}`,
  `使用范围：${answers?.scope || '未说明'}`,
].join('\n');

const buildMessages = (brief, answers) => [
  {
    role: 'system',
    content: [
      ...skillCreatorRules,
      '必须只输出 skill_json 的 JSON object，不要 Markdown 代码块，不要解释，不要额外标签。',
    ].join('\n'),
  },
  {
    role: 'user',
    content: buildUserMessage(brief, answers),
  },
];

const buildStreamingMessages = (brief, answers) => [
  {
    role: 'system',
    content: [
      ...skillCreatorRules,
      '你必须先流式输出用户可见的真实创建草稿，再输出服务端解析用的 skill JSON。',
      '输出只能包含下面两个标签块，顺序固定：<generation_markdown> 然后 <skill_json>。不要输出额外标签或解释。',
      'generation_markdown 不是简单进度列表，必须完整展示技能包的设计和每个生成物的正文。',
      '<generation_markdown>',
      '## 1. 需求分析',
      '',
      '- 用户要创建什么技能、属于什么法律/合规工作场景。',
      '- 输入来源、输出形式、使用范围、风险等级、是否需要确定性脚本或静态资产。',
      '- 明确哪些内容不能编造，哪些信息应作为待确认项。',
      '',
      '## 2. 生成物清单',
      '',
      '| 序号 | 路径 | 类型 | 用途 |',
      '| --- | --- | --- | --- |',
      '| 1 | SKILL.md | 入口说明 | 必需文件，包含 frontmatter、触发场景、输入、工作流、输出、质量检查和边界规则 |',
      '| 2 | {实际支持文件路径} | {支持资料/示例/脚本/资产} | {只有确实生成该文件时才列出，说明它解决什么复杂度问题} |',
      '',
      '生成物清单只能列出实际会生成并写入 skill_json.files 的文件；不生成的 scripts、assets、examples 或 references 不要出现在清单中，也不要解释“不生成原因”。',
      '',
      '## 3. 逐个生成生成物',
      '',
      '### 生成物 1/N：SKILL.md',
      '',
      '```markdown',
      '{完整 SKILL.md 内容，必须包含 YAML frontmatter，frontmatter 只能有 name 和 description}',
      '```',
      '',
      '### 生成物 2/N：{如果生成了支持文件，写真实路径}',
      '',
      '```markdown',
      '{该文件完整内容}',
      '```',
      '',
      '继续按 3/N、4/N 输出所有 files 中的文件。每个 skill_json.files 中的文件都必须在这里出现一次，路径必须完全一致，内容必须完整，不得只写摘要。',
      '',
      '逐个生成完所有文件后，直接结束 generation_markdown。不要输出“待系统解析”“保存结果”“已创建技能”等第四步文案；系统会在解析 skill_json、写入、持久化和读回校验阶段展示独立状态条。',
      '</generation_markdown>',
      '<skill_json>',
      '{完整 JSON}',
      '</skill_json>',
      '上面的 {中文展示名}、{完整 SKILL.md 内容}、{该文件完整内容}、N、路径等都是结构占位说明，实际输出时必须全部替换为真实值，禁止原样保留占位符。',
      'N 必须等于 skill_json.files.length；generation_markdown 中逐个生成的文件路径和 skill_json.files[].path 必须完全一致。',
      'generation_markdown 是模型草稿阶段，只能描述“正在设计/已拟定草稿”，不能描述真实创建结果或系统解析保存状态。',
      '整个模型输出中禁止出现 <answer_markdown>、</answer_markdown> 或 answer_markdown。',
      '整个模型输出中禁止写“已创建技能”“创建流程”“保存结果”“文件结构”“可在技能管理中查看”“已写入”“已保存”“已启用”“已完成读回校验”。这些状态只能由系统在真实解析、写入、持久化、读回校验后追加。',
      'generation_markdown 可以写“正在生成”“草稿”，但不要写系统解析、保存或创建完成状态。',
      'generation_markdown 中的技能名、文件路径必须和 skill_json 保持一致。',
      '不要暗示固定文件数量；明确说明支持文件是按复杂度生成的。',
    ].join('\n'),
  },
  {
    role: 'user',
    content: buildUserMessage(brief, answers),
  },
];

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
    const brief = typeof body?.brief === 'string' ? body.brief.trim() : '';

    if (!brief) {
      sendJson(response, 400, { error: '缺少技能需求' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const wantsStream = body.stream === true;
    const options = body.options && typeof body.options === 'object' ? body.options : {};
    const upstreamBody = buildUpstreamBody({
      model,
      messages: wantsStream
        ? buildStreamingMessages(brief, body.answers || {})
        : buildMessages(brief, body.answers || {}),
      stream: wantsStream,
      options,
      responseFormat: wantsStream ? null : { type: 'json_object' },
    });

    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
    }).finally(() => {
      clearTimeout(timeout);
    });

    if (wantsStream) {
      if (!upstreamResponse.ok) {
        const upstreamData = await upstreamResponse.json().catch(() => null);
        const errorMessage = upstreamData?.error?.message || `DeepSeek 请求失败 (${upstreamResponse.status})`;
        sendJson(response, upstreamResponse.status, { error: errorMessage });
        return;
      }

      await forwardSkillCreatorStream(upstreamResponse, response, model, brief, body.answers || {});
      return;
    }

    const upstreamData = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const errorMessage = upstreamData?.error?.message || `DeepSeek 请求失败 (${upstreamResponse.status})`;
      sendJson(response, upstreamResponse.status, { error: errorMessage });
      return;
    }

    const message = upstreamData?.choices?.[0]?.message;
    const content = `${typeof message?.reasoning_content === 'string' ? message.reasoning_content : ''}${typeof message?.content === 'string' ? message.content : ''}`;
    let parsed = null;
    try {
      parsed = extractJsonObject(content);
    } catch {
      parsed = null;
    }

    sendJson(response, 200, {
      skill: normalizeCreatedSkill(parsed || buildFallbackDraft(brief, body.answers || {}), brief, body.answers || {}),
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
