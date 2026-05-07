import { computed, ref } from 'vue';

export type SkillFileType = 'markdown' | 'typescript' | 'json' | 'template';

export type SkillFile = {
  id: string;
  name: string;
  path: string;
  type: SkillFileType;
  content: string;
};

export type SkillCatalogItem = {
  id: string;
  name: string;
  description: string;
  files: SkillFile[];
};

const docxSkillFiles: SkillFile[] = [
  {
    id: 'docx-skill',
    name: 'SKILL.md',
    path: 'SKILL.md',
    type: 'markdown',
    content: `---
name: docx
description: "Read, inspect, modify, and generate .docx files with OpenXML while preserving document structure."
---

# docx

Use this skill when the task is about operating on Word .docx files themselves: reading document structure, extracting content, editing runs/paragraphs/tables, preserving styles, and writing a valid .docx package.

## Good fit

- Inspect a .docx package and list paragraphs, headings, tables, images, comments, hyperlinks, headers, and footers.
- Replace text while preserving run-level formatting where possible.
- Insert paragraphs, headings, tables, page breaks, comments, and hyperlinks.
- Generate a new .docx from a structured JSON document model.
- Validate that the output opens in Word/WPS and keeps numbering, styles, relationships, and media references intact.

## Inputs

- Source .docx path or a structured document model.
- Edit plan: search text, insertion anchors, table operations, style names, or output path.
- Optional template .docx for style inheritance.

## Workflow

1. Open the .docx as an OpenXML zip package.
2. Parse document.xml plus styles.xml, numbering.xml, relationships, comments, headers, footers, and media entries.
3. Build a normalized document model before editing.
4. Apply edits against paragraph/table anchors instead of raw string replacement when structure matters.
5. Save to a new .docx unless the user explicitly asks to overwrite.
6. Run validation: zip integrity, required parts, broken relationships, numbering references, and changed text summary.

## Output

Return the output .docx path, an edit summary, and validation warnings if the package contains unsupported structures.`,
  },
  {
    id: 'docx-document-model-schema',
    name: 'document-model.schema.json',
    path: 'assets/templates/document-model.schema.json',
    type: 'json',
    content: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DocxDocumentModel",
  "type": "object",
  "required": ["blocks"],
  "properties": {
    "title": { "type": "string" },
    "stylesSource": { "type": "string", "description": "Optional template .docx path." },
    "blocks": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "required": ["type", "text"],
            "properties": {
              "type": { "const": "paragraph" },
              "text": { "type": "string" },
              "style": { "type": "string" }
            }
          },
          {
            "type": "object",
            "required": ["type", "rows"],
            "properties": {
              "type": { "const": "table" },
              "rows": {
                "type": "array",
                "items": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              }
            }
          }
        ]
      }
    }
  }
}`,
  },
  {
    id: 'docx-edit-plan-schema',
    name: 'edit-plan.schema.json',
    path: 'assets/templates/edit-plan.schema.json',
    type: 'json',
    content: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DocxEditPlan",
  "type": "object",
  "required": ["source", "output", "operations"],
  "properties": {
    "source": { "type": "string" },
    "output": { "type": "string" },
    "operations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["op"],
        "properties": {
          "op": {
            "enum": ["replaceText", "insertAfterParagraph", "appendTable", "setCoreProperty"]
          },
          "match": { "type": "string" },
          "text": { "type": "string" },
          "style": { "type": "string" },
          "rows": {
            "type": "array",
            "items": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      }
    }
  }
}`,
  },
  {
    id: 'docx-openxml-parts',
    name: 'openxml-parts.md',
    path: 'references/openxml-parts.md',
    type: 'markdown',
    content: `# OpenXML parts used by .docx

## Required parts

- [Content_Types].xml
- _rels/.rels
- word/document.xml
- word/_rels/document.xml.rels

## Common optional parts

- word/styles.xml: style definitions.
- word/numbering.xml: numbering and list definitions.
- word/comments.xml: comments.
- word/header*.xml and word/footer*.xml: section headers and footers.
- word/media/*: embedded images.
- docProps/core.xml and docProps/app.xml: metadata.

## Editing rule

When adding or removing parts, update relationships and content types in the same transaction.`,
  },
  {
    id: 'docx-editing-rules',
    name: 'editing-rules.md',
    path: 'references/editing-rules.md',
    type: 'markdown',
    content: `# .docx editing rules

## Preserve formatting

- Do not flatten all text into plain paragraphs.
- A paragraph can contain multiple runs because bold, font, color, or field codes may split text.
- For simple replacement, rewrite text across runs and keep the first matching run properties.
- For complex replacement, create a new paragraph/table from the normalized model.

## Avoid unsafe edits

- Do not edit inside field codes, tracked changes, or content controls unless explicitly supported.
- Do not delete relationship targets while they are still referenced.
- Do not reuse numbering IDs without checking numbering.xml.
- Save to a new output path by default.`,
  },
  {
    id: 'docx-read-script',
    name: 'read-docx.ts',
    path: 'scripts/read-docx.ts',
    type: 'typescript',
    content: `import { openDocxPackage, parseDocumentXml } from './engine';

export async function readDocx(path: string) {
  const pkg = await openDocxPackage(path);
  const documentXml = await pkg.readXml('word/document.xml');
  const relationships = await pkg.readRelationships('word/_rels/document.xml.rels');

  return parseDocumentXml(documentXml, relationships);
}`,
  },
  {
    id: 'docx-write-script',
    name: 'write-docx.ts',
    path: 'scripts/write-docx.ts',
    type: 'typescript',
    content: `import { createDocxPackage, renderDocumentXml } from './engine';

export async function writeDocx(model, outputPath: string) {
  const pkg = await createDocxPackage({
    stylesSource: model.stylesSource,
  });

  await pkg.writeXml('word/document.xml', renderDocumentXml(model.blocks));
  await pkg.writeContentTypes();
  await pkg.writeRelationships();
  await pkg.saveAs(outputPath);

  return outputPath;
}`,
  },
  {
    id: 'docx-apply-edits-script',
    name: 'apply-edits.ts',
    path: 'scripts/apply-edits.ts',
    type: 'typescript',
    content: `import { openDocxPackage, applyEditPlan, validatePackage } from './engine';

export async function applyDocxEdits(plan) {
  const pkg = await openDocxPackage(plan.source);
  const summary = await applyEditPlan(pkg, plan.operations);
  const warnings = await validatePackage(pkg);

  await pkg.saveAs(plan.output);
  return { output: plan.output, summary, warnings };
}`,
  },
];

const pdfSkillFiles: SkillFile[] = [
  {
    id: 'pdf-skill',
    name: 'SKILL.md',
    path: 'SKILL.md',
    type: 'markdown',
    content: `---
name: pdf
description: "Generate, merge, index, and inspect legal PDFs for filings and evidence packages."
---

# pdf

Use this skill when the result must be a stable PDF or when source materials are already PDFs.

## Good fit

- Convert legal opinions, evidence catalogues, and settlement documents into PDF.
- Merge multiple exhibits into a paginated evidence bundle.
- Add cover pages, page numbers, bookmarks, and simple redaction notes.
- Extract PDF metadata for document review.

## Workflow

1. Identify whether the PDF is for court filing, client delivery, or internal review.
2. Keep the original evidence order unless the user asks to reorganize.
3. Generate an index with exhibit number, title, page range, and proof purpose.
4. Validate page count after merge.
5. Never silently rewrite source evidence text.

## Output

Return the generated PDF path, page count, and a short checklist of included files.`,
  },
  {
    id: 'pdf-evidence-cover',
    name: 'evidence-cover.md',
    path: 'assets/templates/evidence-cover.md',
    type: 'template',
    content: `# 证据材料封面

案件名称：{case_name}

提交方：{party_name}

提交日期：{submit_date}

## 证据目录摘要

| 证据编号 | 证据名称 | 页码 | 证明目的 |
| --- | --- | --- | --- |
| 证据一 | {evidence_name} | {page_range} | {purpose} |`,
  },
  {
    id: 'pdf-redaction-reference',
    name: 'redaction-checklist.md',
    path: 'references/redaction-checklist.md',
    type: 'markdown',
    content: `# PDF 脱敏检查

## 常见敏感信息

- 身份证号、银行卡号、手机号、住址。
- 未公开商业秘密、客户名单、报价底稿。
- 未成年人身份信息。

## 输出原则

- 脱敏必须保留可理解上下文。
- 对证据关键字段不可无说明地遮盖。
- 输出前复核全文搜索结果，避免遗漏页眉页脚中的敏感信息。`,
  },
  {
    id: 'pdf-evidence-index-reference',
    name: 'evidence-index-rules.md',
    path: 'references/evidence-index-rules.md',
    type: 'markdown',
    content: `# 证据目录规则

证据目录必须至少包含：证据编号、证据名称、来源、页码、证明目的。

## 页码规则

- 合并后重新计算页码，不使用原文件页码。
- 每个附件单独起止页，目录页本身不计入附件页码时要注明。

## 证明目的

证明目的要写到争议焦点，不只写“证明案件事实”。`,
  },
  {
    id: 'pdf-export-script',
    name: 'export-legal-pdf.ts',
    path: 'scripts/export-legal-pdf.ts',
    type: 'typescript',
    content: `import { renderHtmlToPdf } from './engine';

export async function exportLegalPdf(document) {
  return renderHtmlToPdf({
    html: document.html,
    paper: 'A4',
    margin: { top: 28, right: 24, bottom: 28, left: 24 },
    footer: '第 {{page}} 页 / 共 {{pages}} 页',
    bookmarks: document.headings,
  });
}`,
  },
  {
    id: 'pdf-merge-script',
    name: 'merge-evidence-pdf.ts',
    path: 'scripts/merge-evidence-pdf.ts',
    type: 'typescript',
    content: `export async function mergeEvidencePdfs(files) {
  const orderedFiles = files.sort((a, b) => a.index - b.index);
  return {
    output: await mergePdfs(orderedFiles.map((file) => file.path)),
    index: orderedFiles.map((file) => ({
      no: file.no,
      title: file.title,
      purpose: file.purpose,
    })),
  };
}`,
  },
];

const xlsxSkillFiles: SkillFile[] = [
  {
    id: 'xlsx-skill',
    name: 'SKILL.md',
    path: 'SKILL.md',
    type: 'markdown',
    content: `---
name: xlsx
description: "Read, validate, and generate legal spreadsheets for cases, evidence, damages, and contract review."
---

# xlsx

Use this skill when legal work depends on structured tabular data.

## Good fit

- Case ledgers, evidence catalogues, contract risk matrices, fee schedules, and damages calculations.
- Importing Excel data and turning rows into legal questions or document sections.
- Validating that required legal fields are complete before drafting.

## Workflow

1. Identify the sheet purpose and required columns.
2. Normalize dates, amounts, parties, and evidence numbers.
3. Mark missing values before making legal conclusions.
4. Keep formulas visible or explain calculated outputs.
5. Export a clean workbook plus a short validation summary.`,
  },
  {
    id: 'xlsx-case-ledger-template',
    name: 'case-ledger-columns.md',
    path: 'assets/templates/case-ledger-columns.md',
    type: 'template',
    content: `# 案件台账字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| case_id | 是 | 案件唯一编号 |
| party | 是 | 当事人名称 |
| claim_amount | 否 | 诉请金额 |
| status | 是 | 立案/审理/执行/结案 |
| next_deadline | 否 | 下一关键期限 |
| owner | 是 | 负责人 |`,
  },
  {
    id: 'xlsx-damages-template',
    name: 'damages-calculation.md',
    path: 'assets/templates/damages-calculation.md',
    type: 'template',
    content: `# 损失计算表字段

| 字段 | 说明 |
| --- | --- |
| principal | 本金 |
| start_date | 起算日期 |
| end_date | 截止日期 |
| annual_rate | 年利率 |
| penalty_cap | 违约金上限 |

计算结果必须标明公式和依据，不能只给最终金额。`,
  },
  {
    id: 'xlsx-schema-reference',
    name: 'schema-rules.md',
    path: 'references/schema-rules.md',
    type: 'markdown',
    content: `# 法律表格字段规则

## 日期

统一使用 YYYY-MM-DD，不用“去年”“本月初”等相对表达。

## 金额

金额字段保留两位小数，另设 currency 字段。

## 主体名称

同一主体名称必须全文一致，简称应单独建 alias 字段。`,
  },
  {
    id: 'xlsx-risk-matrix-reference',
    name: 'risk-matrix-rules.md',
    path: 'references/risk-matrix-rules.md',
    type: 'markdown',
    content: `# 合同风险矩阵规则

| 风险等级 | 判断标准 |
| --- | --- |
| 高 | 影响合同目的、付款安全、核心责任或争议解决 |
| 中 | 增加履行成本或造成解释争议 |
| 低 | 表述不够清晰但不影响主要权利义务 |

每条风险必须对应原文条款和修改建议。`,
  },
  {
    id: 'xlsx-import-script',
    name: 'import-legal-xlsx.ts',
    path: 'scripts/import-legal-xlsx.ts',
    type: 'typescript',
    content: `export function normalizeLegalRows(rows) {
  return rows.map((row) => ({
    ...row,
    party: String(row.party || '').trim(),
    claim_amount: Number(row.claim_amount || 0),
    next_deadline: normalizeDate(row.next_deadline),
  }));
}`,
  },
  {
    id: 'xlsx-validate-script',
    name: 'validate-legal-xlsx.ts',
    path: 'scripts/validate-legal-xlsx.ts',
    type: 'typescript',
    content: `export function validateCaseLedger(rows) {
  const required = ['case_id', 'party', 'status', 'owner'];
  return rows.flatMap((row, index) =>
    required
      .filter((field) => !row[field])
      .map((field) => ({ row: index + 2, field, message: '缺少必填字段' }))
  );
}`,
  },
];

type LegalWorkflowSkillSeed = {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  overview: string;
  goodFit: string[];
  workflow: string[];
  output: string[];
  guardrails: string[];
  referenceName: string;
  referenceContent: string;
  templateName: string;
  templateContent: string;
};

const renderBullets = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const createLegalWorkflowSkillFiles = (skill: LegalWorkflowSkillSeed): SkillFile[] => [
  {
    id: `${skill.id}-skill`,
    name: 'SKILL.md',
    path: 'SKILL.md',
    type: 'markdown',
    content: `---
name: ${skill.name}
description: "${skill.shortDescription}"
---

# ${skill.name}

${skill.overview}

## 适用场景

${renderBullets(skill.goodFit)}

## 工作流

${skill.workflow.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## 输出要求

${renderBullets(skill.output)}

## 边界规则

${renderBullets(skill.guardrails)}

## 需要时读取

- references/${skill.referenceName}: 详细判断规则和检查清单。
- assets/templates/${skill.templateName}: 标准输出模板。`,
  },
  {
    id: `${skill.id}-reference`,
    name: skill.referenceName,
    path: `references/${skill.referenceName}`,
    type: 'markdown',
    content: skill.referenceContent,
  },
  {
    id: `${skill.id}-template`,
    name: skill.templateName,
    path: `assets/templates/${skill.templateName}`,
    type: 'template',
    content: skill.templateContent,
  },
];

const legalWorkflowSkillSeeds: LegalWorkflowSkillSeed[] = [
  {
    id: 'legal-intake',
    name: 'legal-intake',
    description: '法律事实采集与问题澄清，把模糊咨询整理成可回答、可检索、可写作的事实框架。',
    shortDescription: 'Collect facts, goals, jurisdiction, evidence, and missing information before legal work.',
    overview:
      '用于法律问答、文书写作、检索分析前的事实采集。先把用户的零散描述整理为主体、地域、时间线、金额、证据、目标和待确认事项，再决定是否进入回答、搜索或写作。',
    goodFit: [
      '用户只描述了片段事实，但还没有形成清晰法律问题。',
      '需要在起草起诉状、律师函、法律意见或合同审查前补齐背景。',
      '需要判断下一步应追问、检索、写作还是整理证据。',
    ],
    workflow: [
      '识别事项类型、用户立场、预期目标和紧急期限。',
      '抽取当事人、地区、时间线、金额、合同或行为节点、已有证据。',
      '把已确认事实、用户推测、法律判断和缺口分开记录。',
      '只追问会影响结论或文书结构的必要问题。',
      '给出下一步可进入的技能或工作流建议。',
    ],
    output: [
      '输出事实摘要、缺口清单、追问问题和建议进入的下一步。',
      '每个追问都说明为什么会影响法律判断或文书内容。',
      '对紧急期限、诉讼时效、管辖、证据灭失风险单独标记。',
    ],
    guardrails: [
      '不得把未确认事实写成确定事实。',
      '不得在事实缺口明显时直接给最终法律结论。',
      '不得替用户虚构证据、金额、日期、主体身份或诉讼请求。',
    ],
    referenceName: 'intake-checklist.md',
    referenceContent: `# 法律事实采集清单

## 基础字段

| 字段 | 说明 |
| --- | --- |
| 用户身份 | 咨询人、代理人、当事人或旁观者 |
| 对方主体 | 自然人、公司、机关、平台或其他组织 |
| 地域 | 合同履行地、侵权地、不动产所在地、法院或仲裁约定 |
| 时间线 | 签署、付款、履行、违约、通知、起诉、执行等节点 |
| 金额 | 本金、违约金、利息、损失、费用 |
| 材料 | 合同、聊天记录、付款凭证、发票、收据、录音、判决书 |
| 目标 | 咨询判断、谈判、发函、起诉、答辩、检索或写作 |

## 追问优先级

1. 会影响诉讼时效、期限、管辖、主体资格的问题优先。
2. 会影响请求权基础和责任承担的问题其次。
3. 仅影响表达完整度的问题最后。

## 事实标记

- 已确认：用户明确提供或文件中可见。
- 待确认：用户没有说清，但会影响判断。
- 推测：用户表达了猜测或情绪化判断。
- 法律判断：需要引用规则或检索后才能确认。`,
    templateName: 'intake-output.md',
    templateContent: `# 法律事实采集结果

## 已确认事实

| 类别 | 内容 |
| --- | --- |
| 用户身份 | {user_role} |
| 对方主体 | {counterparty} |
| 地域/管辖 | {jurisdiction} |
| 关键时间线 | {timeline} |
| 争议金额 | {amount} |
| 已有材料 | {materials} |

## 待确认事项

| 问题 | 影响 |
| --- | --- |
| {question} | {impact} |

## 下一步建议

- 建议进入：{next_skill}
- 原因：{reason}`,
  },
  {
    id: 'legal-answer',
    name: 'legal-answer',
    description: '通用法律问答，按结论、依据、适用条件、风险和下一步组织咨询回复。',
    shortDescription: 'Answer legal questions with conclusion, basis, conditions, risks, and next steps.',
    overview:
      '用于把用户的法律咨询转成结构化答复。强调先确认事实边界，再给分层结论、法律依据、风险提示和可执行下一步。',
    goodFit: [
      '用户问能不能做、是否违法、有没有胜算、该怎么办。',
      '需要给非律师用户清楚解释法律判断和风险。',
      '需要把复杂问题拆成短结论和行动建议。',
    ],
    workflow: [
      '先复述问题和关键事实边界，标记未确认事项。',
      '判断是否可以直接回答；若事实不足，先列最少必要追问。',
      '按请求权基础、责任构成、抗辩点或程序路径组织分析。',
      '把结论分成确定、倾向、需补充确认三个层级。',
      '给出下一步行动、材料准备和风险提示。',
    ],
    output: [
      '先给短结论，再给理由和依据。',
      '区分法律风险、证据风险、程序风险和执行风险。',
      '引用依据时写清法律名称、条文或检索待确认状态。',
    ],
    guardrails: [
      '不得承诺案件结果或保证胜诉。',
      '对需要实时检索的现行法、地方政策或最新裁判规则必须标明需核验。',
      '不得忽略用户所在地区、主体身份和时间节点。',
    ],
    referenceName: 'answer-structure.md',
    referenceContent: `# 法律问答结构

## 标准层次

1. 短结论：一句话说明倾向。
2. 适用前提：说明结论依赖哪些事实。
3. 法律依据：列出规则来源或待检索来源。
4. 具体分析：把事实代入规则。
5. 风险提示：证据、程序、时效、执行。
6. 下一步：补材料、沟通、发函、起诉、报警、投诉或继续检索。

## 结论强度

| 强度 | 使用条件 |
| --- | --- |
| 可以明确 | 事实充分，规则稳定 |
| 初步倾向 | 事实基本够用，但仍有关键变量 |
| 暂不能判断 | 关键事实缺失或需要现行规则核验 |

## 常见风险类型

- 诉讼时效或除斥期间。
- 管辖或仲裁条款。
- 主体不适格。
- 证据真实性、关联性、合法性不足。
- 责任比例或损失金额难以证明。`,
    templateName: 'answer-template.md',
    templateContent: `# 法律问答回复

## 短结论

{conclusion}

## 适用前提

- {condition}

## 分析

1. {analysis_point}

## 风险提示

| 风险 | 说明 | 建议 |
| --- | --- | --- |
| {risk} | {detail} | {action} |

## 下一步

- {next_step}`,
  },
  {
    id: 'legal-research',
    name: 'legal-research',
    description: '法律研究报告生成，面向复杂问题输出问题拆解、规范依据、类案观点和结论。',
    shortDescription: 'Create legal research memos with issue trees, rules, cases, analysis, and conclusions.',
    overview:
      '用于复杂法律问题、内部研究备忘录、客户法律意见前的系统分析。重点是问题树、依据来源、争议观点、类案规则和可落地结论。',
    goodFit: [
      '用户要求研究一个复杂法律问题，而不是简单咨询。',
      '需要形成可交付的研究报告、法律意见基础稿或内部备忘录。',
      '需要综合法规、案例、监管口径、学理观点和实务路径。',
    ],
    workflow: [
      '确认研究问题、法域、时间范围、交付对象和深度。',
      '拆成核心问题、子问题和事实变量。',
      '列出需要检索的规范、案例、政策和观点来源。',
      '分析主流规则、例外情形、争议点和对本案的适用。',
      '输出结论、建议路径、证据需求和待核验来源。',
    ],
    output: [
      '报告必须包含问题、结论、依据、分析、风险和待补充材料。',
      '对没有检索确认的依据标明待核验，不伪造条文或案例。',
      '复杂问题用表格呈现观点差异和适用条件。',
    ],
    guardrails: [
      '不得把研究报告写成泛泛普法文章。',
      '不得跳过事实变量直接套用法条。',
      '不得编造案例案号、法院、裁判日期或条文编号。',
    ],
    referenceName: 'research-memo-rules.md',
    referenceContent: `# 法律研究报告规则

## 问题树

| 层级 | 内容 |
| --- | --- |
| 主问题 | 用户真正需要解决的法律判断 |
| 子问题 | 构成要件、程序路径、责任范围、抗辩事由 |
| 事实变量 | 可能改变结论的事实 |
| 检索对象 | 法律、司法解释、案例、监管规则、地方规定 |

## 观点比较

| 观点 | 适用条件 | 支持依据 | 对本案影响 |
| --- | --- | --- | --- |

## 研究结论标准

- 结论要能回应原问题。
- 建议要能转化为行动。
- 风险要说明触发条件。
- 待核验项要列明检索方向。`,
    templateName: 'research-memo-template.md',
    templateContent: `# 法律研究报告

## 研究问题

{question}

## 初步结论

{conclusion}

## 问题拆解

| 子问题 | 事实变量 | 需要检索 |
| --- | --- | --- |
| {issue} | {fact_variable} | {source_target} |

## 依据与分析

### {issue_title}

{analysis}

## 风险与建议

| 风险 | 触发条件 | 建议 |
| --- | --- | --- |
| {risk} | {condition} | {suggestion} |

## 待核验事项

- {verification_item}`,
  },
  {
    id: 'law-search',
    name: 'law-search',
    description: '法规、司法解释、政策和规范性文件检索，把问题转成检索计划与引用清单。',
    shortDescription: 'Turn legal questions into law, regulation, policy, and citation search plans.',
    overview:
      '用于法律搜索场景，把自然语言问题转成法域、效力层级、关键词、时间范围、排除词和引用清单。适合在正式回答或写作前先做依据定位。',
    goodFit: [
      '需要查找法律、司法解释、部门规章、地方规定或政策口径。',
      '需要把用户问题拆成检索关键词和权威来源顺序。',
      '需要输出可引用的依据清单，而不是直接写答案。',
    ],
    workflow: [
      '识别法域、地域、效力层级、时间范围和问题类型。',
      '生成核心关键词、同义词、排除词和组合检索式。',
      '按法律、行政法规、司法解释、部门规章、地方文件排序检索目标。',
      '记录依据名称、条文、发布日期、施行状态和适用关系。',
      '输出可用于问答、研究或写作的引用清单。',
    ],
    output: [
      '输出检索计划、关键词组、来源优先级和引用表。',
      '区分现行有效、已废止、修订中、地方适用和待核验。',
      '说明每条依据解决哪个子问题。',
    ],
    guardrails: [
      '不得用不明来源网页替代正式法规来源。',
      '不得省略效力状态和适用地域。',
      '不得把检索计划直接包装成最终法律结论。',
    ],
    referenceName: 'source-priority.md',
    referenceContent: `# 法律检索来源优先级

## 规范来源顺序

1. 法律。
2. 行政法规。
3. 司法解释、司法文件。
4. 部门规章。
5. 地方性法规、地方政府规章、地方规范性文件。
6. 监管问答、办案指南、会议纪要。
7. 裁判观点和案例。

## 检索字段

| 字段 | 说明 |
| --- | --- |
| keyword | 核心概念 |
| synonyms | 同义词、近义词、旧称 |
| exclude | 排除词 |
| jurisdiction | 全国或具体地区 |
| effective_date | 施行或修订时间 |
| authority | 发布机关 |

## 引用注意

- 同一问题有上位法和下位法时，先列上位法。
- 地方文件只能在对应地域内使用。
- 已废止依据只能用于历史事实或修订沿革说明。`,
    templateName: 'law-search-plan.md',
    templateContent: `# 法律检索计划

## 检索目标

{search_goal}

## 关键词

| 类型 | 内容 |
| --- | --- |
| 核心词 | {keywords} |
| 同义词 | {synonyms} |
| 排除词 | {exclude_terms} |

## 来源优先级

| 顺序 | 来源 | 目标 |
| --- | --- | --- |
| 1 | {source_type} | {target_rule} |

## 引用清单

| 依据 | 条文/章节 | 效力状态 | 适用问题 |
| --- | --- | --- | --- |
| {law_name} | {article} | {status} | {issue} |`,
  },
  {
    id: 'case-search',
    name: 'case-search',
    description: '类案检索与裁判规则提炼，比较事实、争议焦点、裁判理由和本案适用差异。',
    shortDescription: 'Search and compare similar cases by facts, issues, holdings, and differences.',
    overview:
      '用于类案检索、裁判规则归纳和案件胜诉风险判断。重点不是堆案例，而是比较本案与类案的事实相似度、争议焦点和裁判逻辑。',
    goodFit: [
      '需要找相似案例支持法律意见、诉讼策略或文书观点。',
      '需要从多个判决中提炼裁判规则。',
      '需要判断某个案例能否真正类比到本案。',
    ],
    workflow: [
      '确认案件类型、案由、法院层级、地域、时间范围和核心事实。',
      '生成案例检索关键词，包括案由、行为、争议焦点、抗辩事由。',
      '筛选案例时优先看事实相似度、法院层级、裁判时间和规则明确度。',
      '提炼每个案例的争议焦点、裁判规则、结果和关键差异。',
      '输出可引用案例、不可类比原因和本案适用建议。',
    ],
    output: [
      '用表格展示案例事实、争议焦点、裁判结果和相似度。',
      '每个类案必须写明对本案支持或不利的具体原因。',
      '单独列出差异过大、不宜引用的案例。',
    ],
    guardrails: [
      '不得只因为案由相同就认定为类案。',
      '不得伪造案号、法院、审理程序或裁判日期。',
      '不得忽略不利案例和相反裁判观点。',
    ],
    referenceName: 'case-comparison-rules.md',
    referenceContent: `# 类案比较规则

## 相似度维度

| 维度 | 说明 |
| --- | --- |
| 法律关系 | 合同、侵权、劳动、婚姻、公司等 |
| 核心事实 | 行为方式、履行过程、违约形态、损害后果 |
| 争议焦点 | 法律适用和事实认定焦点 |
| 证据结构 | 证据类型和证明强度 |
| 法院层级 | 最高法、高院、中院、基层法院 |
| 时间 | 是否适用现行规则和当前裁判倾向 |

## 案例分组

- 强相关：事实结构和争议焦点高度一致。
- 可参考：法律问题接近，但事实或证据有差异。
- 仅背景：只能说明一般规则，不宜作为核心依据。
- 不利案例：结论相反或暴露本案风险。`,
    templateName: 'case-search-report.md',
    templateContent: `# 类案检索报告

## 检索问题

{case_question}

## 检索条件

| 条件 | 内容 |
| --- | --- |
| 案由 | {cause_of_action} |
| 关键词 | {keywords} |
| 法院/地域 | {court_scope} |
| 时间范围 | {date_range} |

## 类案对比

| 案例 | 案号 | 法院 | 核心事实 | 裁判规则 | 相似度 | 对本案影响 |
| --- | --- | --- | --- | --- | --- | --- |
| {case_name} | {case_no} | {court} | {facts} | {holding} | {similarity} | {impact} |

## 不利或差异案例

- {adverse_case}

## 本案适用建议

{recommendation}`,
  },
  {
    id: 'legal-writing',
    name: 'legal-writing',
    description: '通用法律文书写作，先确认文书类型、立场、事实、请求和语气，再生成结构化草稿。',
    shortDescription: 'Draft legal documents from document type, position, facts, claims, evidence, and tone.',
    overview:
      '用于起诉状、答辩状、律师函、法律意见书、代理意见、备忘录等法律写作。重点是写作前先锁定文书类型、对象、立场、事实、请求和证据。',
    goodFit: [
      '用户要求起草或改写法律文书。',
      '需要把事实材料整理成正式、可交付、可修改的文书草稿。',
      '需要根据不同收件对象调整语气和结构。',
    ],
    workflow: [
      '确认文书类型、使用场景、收件对象、作者身份和目标。',
      '整理事实顺序、证据支撑、法律依据和请求事项。',
      '先输出提纲或要素清单，再生成正文。',
      '按文书类型控制格式、标题、称谓、落款和附件。',
      '最后列出需用户补充或人工复核的内容。',
    ],
    output: [
      '输出文书草稿、要素缺口和可选表达。',
      '事实、理由、请求、证据必须相互对应。',
      '保留可替换占位符，不虚构未知信息。',
    ],
    guardrails: [
      '不得编造案号、法院、身份证号、地址、日期或证据。',
      '不得把草稿包装成已由律师审定的正式文件。',
      '不得为了流畅而删除关键事实限制或风险提示。',
    ],
    referenceName: 'drafting-rules.md',
    referenceContent: `# 法律文书写作规则

## 写作前确认

| 项目 | 说明 |
| --- | --- |
| 文书类型 | 起诉状、答辩状、律师函、法律意见书等 |
| 使用对象 | 法院、仲裁委、对方当事人、客户、内部团队 |
| 用户立场 | 原告、被告、申请人、被申请人、顾问 |
| 核心目标 | 主张权利、抗辩、催告、谈判、说明风险 |
| 材料 | 合同、证据、检索依据、既有草稿 |

## 正文组织

1. 先事实，后法律评价。
2. 先无争议事实，后争议事实。
3. 请求事项必须能被事实和依据支撑。
4. 语气根据对象调整：法院文书克制，对方函件明确，客户意见解释充分。`,
    templateName: 'document-brief.md',
    templateContent: `# 法律文书写作任务单

## 文书信息

| 项目 | 内容 |
| --- | --- |
| 文书类型 | {document_type} |
| 使用对象 | {recipient} |
| 用户立场 | {position} |
| 写作目标 | {goal} |
| 语气 | {tone} |

## 事实与证据

| 事实 | 证据 | 是否确认 |
| --- | --- | --- |
| {fact} | {evidence} | {status} |

## 请求或主张

- {claim}

## 待补充

- {missing_item}`,
  },
  {
    id: 'evidence-organizer',
    name: 'evidence-organizer',
    description: '证据清单与证明目的整理，把材料对应到争议焦点、证明目的和补强建议。',
    shortDescription: 'Organize evidence by fact, proof purpose, issue, source, and gap.',
    overview:
      '用于证据目录、诉讼材料准备、合同纠纷、劳动争议、借贷纠纷等场景。把用户材料转成证据名称、来源、对应事实、证明目的、风险和补强建议。',
    goodFit: [
      '用户上传或描述了大量材料，需要整理成证据目录。',
      '需要判断哪些证据能证明哪些争议焦点。',
      '需要发现证据缺口、真实性风险和补强方向。',
    ],
    workflow: [
      '先确定案件目标、争议焦点和待证明事实。',
      '逐项抽取证据名称、来源、形成时间、持有人和内容摘要。',
      '把每项证据对应到一个或多个待证明事实。',
      '评估真实性、关联性、合法性和证明力风险。',
      '输出证据目录、缺口清单和补强建议。',
    ],
    output: [
      '证据表必须包含证据编号、名称、来源、证明目的和风险。',
      '证明目的要对应争议焦点，不写空泛表述。',
      '对关键事实没有证据支撑的地方单独列缺口。',
    ],
    guardrails: [
      '不得伪造证据来源或形成时间。',
      '不得把用户没有提供的材料写入已有证据。',
      '不得忽略录音、聊天记录、电子数据的合法性和完整性风险。',
    ],
    referenceName: 'evidence-matrix-rules.md',
    referenceContent: `# 证据矩阵规则

## 证据三性

| 维度 | 检查点 |
| --- | --- |
| 真实性 | 来源、原件、形成过程、电子数据完整性 |
| 关联性 | 是否对应争议焦点或待证明事实 |
| 合法性 | 取得方式、隐私、商业秘密、录音录像合法性 |

## 证明目的写法

不推荐：证明案件事实。

推荐：证明被告于某日期收到货物但未按合同约定付款。

## 补强方向

- 缺合同原件：补签署页、盖章页、邮件往来。
- 缺付款证据：补银行流水、收据、发票。
- 缺交付证据：补签收单、物流记录、验收单。
- 缺通知证据：补短信、邮件、快递回执、聊天记录。`,
    templateName: 'evidence-index.md',
    templateContent: `# 证据目录

| 编号 | 证据名称 | 来源 | 形成时间 | 证明目的 | 对应事实 | 风险 | 补强建议 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 证据一 | {evidence_name} | {source} | {date} | {purpose} | {fact} | {risk} | {suggestion} |

## 证据缺口

| 待证明事实 | 现有证据 | 缺口 | 建议 |
| --- | --- | --- | --- |
| {fact_to_prove} | {current_evidence} | {gap} | {action} |`,
  },
  {
    id: 'citation-check',
    name: 'citation-check',
    description: '法律引用校验，检查条文、案例、文号、效力状态、引用格式和待核验风险。',
    shortDescription: 'Check statutes, cases, document numbers, validity status, and citation formatting.',
    overview:
      '用于问答、研究报告、法律意见和文书交付前的依据校验。重点是发现伪引、错引、旧法、失效依据、案号不完整和引用格式问题。',
    goodFit: [
      '已有法律分析或文书，需要校验引用是否可靠。',
      '需要统一法条、案例、政策文件和脚注格式。',
      '需要把待核验引用和高风险引用单独列出。',
    ],
    workflow: [
      '抽取全文中的法律、司法解释、政策文件、案例和文号。',
      '检查名称、条文、发文机关、发布日期、施行日期和效力状态。',
      '识别旧法、已废止、地方适用、条文编号错误和案例信息缺失。',
      '按风险等级给出修正建议或待检索项。',
      '输出可替换的规范引用格式。',
    ],
    output: [
      '输出引用清单、问题清单、修正建议和待核验项。',
      '每条问题标注风险等级和影响范围。',
      '保留原文位置，便于回到文书修改。',
    ],
    guardrails: [
      '不得凭记忆确认最新效力状态。',
      '不得补写无法确认的案号、日期或条文。',
      '不得只做文字润色而忽略依据有效性。',
    ],
    referenceName: 'citation-validation-rules.md',
    referenceContent: `# 引用校验规则

## 法规引用字段

| 字段 | 检查 |
| --- | --- |
| 名称 | 是否为正式名称 |
| 条文 | 条、款、项是否准确 |
| 效力 | 现行有效、已废止、尚未施行、部分修订 |
| 地域 | 全国或地方适用 |
| 时间 | 是否适用于案件事实发生时 |

## 案例引用字段

| 字段 | 检查 |
| --- | --- |
| 案号 | 是否完整 |
| 法院 | 是否明确 |
| 日期 | 裁判日期或公布日期 |
| 程序 | 一审、二审、再审、执行 |
| 规则 | 引用的是裁判规则还是事实背景 |

## 风险等级

- 高：可能导致结论依据错误。
- 中：影响论证可信度或适用范围。
- 低：格式不统一或信息不完整。`,
    templateName: 'citation-check-report.md',
    templateContent: `# 引用校验报告

## 引用清单

| 原文引用 | 类型 | 状态 | 问题 | 风险 | 建议 |
| --- | --- | --- | --- | --- | --- |
| {citation} | {type} | {status} | {issue} | {risk_level} | {fix} |

## 可替换写法

原文：{original}

建议：{replacement}

## 待核验

- {verification_item}`,
  },
  {
    id: 'contract-review',
    name: 'contract-review',
    description: '通用合同审查，识别条款风险、风险等级、原因、修改建议和替代条款。',
    shortDescription: 'Review contract clauses for risks, levels, reasons, revisions, and replacement wording.',
    overview:
      '用于合同片段或完整合同的快速审查。按交易背景、用户立场、核心条款、风险等级、修改建议和替代文本输出。',
    goodFit: [
      '用户粘贴合同条款，要求看风险或怎么改。',
      '需要站在甲方、乙方、买方、卖方、出租方、承租方等立场审查。',
      '需要把审查结果整理为风险矩阵或修改清单。',
    ],
    workflow: [
      '确认合同类型、交易目的、用户立场和重点关注事项。',
      '按主体、标的、价款、履行、违约、解除、知识产权、保密、争议解决检查。',
      '对每条风险标注高、中、低和影响原因。',
      '给出可执行修改建议，必要时提供替代条款。',
      '列出需要业务确认的事实和附件。',
    ],
    output: [
      '每个风险必须对应原文条款或缺失条款。',
      '修改建议要能直接交给合同对方沟通。',
      '区分法律风险、商业风险和表达风险。',
    ],
    guardrails: [
      '不得离开用户立场泛泛审查。',
      '不得虚构合同没有写明的交易条件。',
      '不得把所有问题都标成高风险。',
    ],
    referenceName: 'contract-risk-levels.md',
    referenceContent: `# 合同风险等级

## 风险等级

| 等级 | 标准 |
| --- | --- |
| 高 | 影响合同目的、付款安全、核心责任、权利归属或争议解决 |
| 中 | 增加履行成本、举证难度、解释争议或管理成本 |
| 低 | 表述不清、格式不统一、建议优化但不影响主要权利义务 |

## 常见审查模块

- 主体资格和授权。
- 标的、数量、质量、验收。
- 价款、付款节点、税费、发票。
- 履行期限、交付、变更。
- 违约责任、赔偿范围、责任限制。
- 解除、终止、通知。
- 保密、知识产权、数据与合规。
- 管辖、仲裁、法律适用。`,
    templateName: 'contract-review-matrix.md',
    templateContent: `# 合同审查矩阵

| 条款 | 风险等级 | 风险类型 | 问题 | 修改建议 | 替代条款 |
| --- | --- | --- | --- | --- | --- |
| {clause} | {level} | {risk_type} | {issue} | {suggestion} | {replacement} |

## 需业务确认

- {business_question}

## 缺失条款建议

- {missing_clause}`,
  },
  {
    id: 'document-polish',
    name: 'document-polish',
    description: '法律文本润色与格式规范，提升正式性、逻辑顺序、编号、称谓和法言法语表达。',
    shortDescription: 'Polish legal text for formal tone, logic, numbering, terminology, and formatting.',
    overview:
      '用于法律文本的表达优化、格式统一和交付前清理。保持原意不变，提升正式性、逻辑清晰度、编号一致性和法律表达准确性。',
    goodFit: [
      '用户已有草稿，需要变得更正式、更清楚或更像法律文书。',
      '需要统一标题、编号、称谓、日期、金额和引用格式。',
      '需要在不改变法律立场的前提下优化表达。',
    ],
    workflow: [
      '确认文本用途、收件对象、语气和是否允许实质改写。',
      '先识别原文结构、主张、事实和法律依据。',
      '修正口语化、重复、歧义、编号混乱和称谓不一致。',
      '保留原意，对可能改变法律效果的改动单独说明。',
      '输出润色稿和修改说明。',
    ],
    output: [
      '输出润色后正文和主要修改点。',
      '对实质性修改、事实补充或法律判断变化单独标记。',
      '如果原文缺事实或依据，不用润色掩盖缺口。',
    ],
    guardrails: [
      '不得擅自改变用户立场、请求事项或承认事实。',
      '不得为了文风而删除限制条件和证据边界。',
      '不得添加未经确认的法条、案例或事实。',
    ],
    referenceName: 'legal-style-rules.md',
    referenceContent: `# 法律文本风格规则

## 优化方向

| 问题 | 处理 |
| --- | --- |
| 口语化 | 改为正式表达 |
| 逻辑跳跃 | 增加过渡或调整顺序 |
| 主体混乱 | 统一称谓 |
| 编号混乱 | 统一层级和格式 |
| 事实与评价混杂 | 分开事实陈述和法律评价 |

## 保留原则

- 保留原始立场。
- 保留事实边界。
- 保留不确定性提示。
- 保留证据不足的说明。

## 需要提示用户的改动

- 可能构成事实承认。
- 可能扩大或缩小请求范围。
- 可能改变责任承担表述。
- 可能影响谈判强硬程度。`,
    templateName: 'polish-result.md',
    templateContent: `# 法律文本润色结果

## 润色后正文

{polished_text}

## 主要修改

| 位置 | 修改类型 | 说明 |
| --- | --- | --- |
| {location} | {change_type} | {note} |

## 需用户确认

- {confirmation_item}`,
  },
];

const legalWorkflowSkills: SkillCatalogItem[] = legalWorkflowSkillSeeds.map((skill) => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
  files: createLegalWorkflowSkillFiles(skill),
}));

export const defaultSkills: SkillCatalogItem[] = [
  {
    id: 'docx',
    name: 'docx',
    description: '读取、解析、修改和生成 .docx 文件，保留 Word 结构、样式、编号和关系引用。',
    files: docxSkillFiles,
  },
  {
    id: 'pdf',
    name: 'pdf',
    description: '生成、合并和校验法律 PDF，适合证据包、提交材料和客户交付稿。',
    files: pdfSkillFiles,
  },
  {
    id: 'xlsx',
    name: 'xlsx',
    description: '处理案件台账、证据目录、损失计算和合同风险矩阵等法律表格。',
    files: xlsxSkillFiles,
  },
];

export const recommendedSkills: SkillCatalogItem[] = legalWorkflowSkills;

const addedRecommendedSkillStorageKey = 'legal-version-added-recommended-skill-ids';
const recommendedSkillIds = new Set(recommendedSkills.map((skill) => skill.id));

const normalizeAddedSkillIds = (ids: string[]) =>
  Array.from(new Set(ids.filter((id) => recommendedSkillIds.has(id))));

const readAddedSkillIds = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(addedRecommendedSkillStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeAddedSkillIds(parsed.filter((item) => typeof item === 'string')) : [];
  } catch {
    return [];
  }
};

const writeAddedSkillIds = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(addedRecommendedSkillStorageKey, JSON.stringify(ids));
};

const addedRecommendedSkillIds = ref<string[]>(readAddedSkillIds());

export const availableSkills = computed<SkillCatalogItem[]>(() => [
  ...defaultSkills,
  ...recommendedSkills.filter((skill) => addedRecommendedSkillIds.value.includes(skill.id)),
]);

export const registeredSkillNames = computed(() => new Set([
  ...availableSkills.value.map((skill) => skill.name),
  'skill-creator',
  'template-creator',
]));

export const isRegisteredSkillName = (skillName: string) => registeredSkillNames.value.has(skillName);

export const isRecommendedSkill = (skillId: string) => recommendedSkillIds.has(skillId);

export const isAddedRecommendedSkill = (skillId: string) => addedRecommendedSkillIds.value.includes(skillId);

export const addRecommendedSkill = (skillId: string) => {
  if (!recommendedSkillIds.has(skillId)) return false;
  if (addedRecommendedSkillIds.value.includes(skillId)) return false;

  const nextIds = normalizeAddedSkillIds([...addedRecommendedSkillIds.value, skillId]);
  addedRecommendedSkillIds.value = nextIds;
  writeAddedSkillIds(nextIds);
  return true;
};
