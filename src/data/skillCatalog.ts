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

const onboardedLegalSkillSeeds: LegalWorkflowSkillSeed[] = [
  {
    id: 'contract-drafting',
    name: '合同起草',
    description: '基于模板与业务信息的合同起草助手。',
    shortDescription: 'Draft contracts from transaction facts, party positions, clauses, risk allocation, and templates.',
    overview:
      '用于从零起草或基于模板生成合同文本。先确认交易类型、主体信息、履行安排、价款、验收、违约、解除、争议解决和附件清单，再生成可继续编辑的合同草稿。',
    goodFit: [
      '用户要起草买卖、服务、租赁、借款、合作、保密、股权转让等合同。',
      '已有业务要点或旧模板，需要整理成结构完整的合同初稿。',
      '需要站在甲方、乙方、采购方、供应方、出租方或承租方立场配置条款。',
    ],
    workflow: [
      '确认合同类型、适用场景、用户立场、交易目的和是否已有模板。',
      '抽取主体、标的、数量、价款、税费、付款、交付、验收、期限、附件和联系人。',
      '识别必须追问的关键缺口，尤其是主体资格、授权、标的边界、付款条件和验收标准。',
      '按合同结构生成标题、首部、定义、核心条款、一般条款、违约责任、争议解决、签署页和附件。',
      '根据用户立场加入风险保护条款，例如付款保障、验收异议、责任上限、解除权、保密和知识产权。',
      '输出草稿后附上缺口清单、需业务确认项和可谈判条款。',
    ],
    output: [
      '输出完整合同草稿，并保留待补充字段占位符。',
      '同时输出条款说明、风险提示、业务确认清单和附件清单。',
      '对可能影响交易安全的缺失信息单独标注，不用虚构内容补齐。',
    ],
    guardrails: [
      '不得编造主体名称、统一社会信用代码、金额、日期、账户、授权或附件。',
      '不得把不确定的交易条件写成确定承诺。',
      '不得忽略用户立场，不能输出双方保护力度完全相同的空泛模板。',
      '涉及强监管行业、数据出境、金融、医疗、劳动用工等事项时必须提示专项合规核验。',
    ],
    referenceName: 'contract-drafting-checklist.md',
    referenceContent: `# 合同起草检查清单

## 起草前字段

| 字段 | 说明 |
| --- | --- |
| 合同类型 | 买卖、服务、租赁、借款、合作、保密、股权等 |
| 用户立场 | 甲方、乙方、买方、卖方、出租方、承租方等 |
| 主体信息 | 名称、证照、授权代表、联系地址、签署权限 |
| 标的边界 | 服务范围、货物规格、项目成果、排除事项 |
| 价款税费 | 金额、币种、税率、发票、付款节点和条件 |
| 履行验收 | 交付时间、交付方式、验收标准、异议期限 |
| 风险分配 | 违约责任、责任上限、解除、不可抗力、保密、知识产权 |
| 争议解决 | 管辖法院、仲裁机构、适用法律、送达地址 |

## 必要追问

1. 没有主体信息时，先要求补充准确名称和签约身份。
2. 没有标的范围时，不能直接生成义务边界。
3. 没有付款和验收条件时，违约责任只能写成占位建议。
4. 没有用户立场时，先追问保护侧重点。`,
    templateName: 'contract-draft-template.md',
    templateContent: `# 合同草稿

## 合同名称

{contract_title}

## 当事人

| 角色 | 主体名称 | 证照/身份信息 | 联系方式 |
| --- | --- | --- | --- |
| 甲方 | {party_a} | {party_a_id} | {party_a_contact} |
| 乙方 | {party_b} | {party_b_id} | {party_b_contact} |

## 正文条款

1. 合同目的与标的：{subject}
2. 价款与支付：{payment_terms}
3. 履行与交付：{delivery_terms}
4. 验收与质量：{acceptance_terms}
5. 双方权利义务：{obligations}
6. 违约责任：{breach_terms}
7. 解除与终止：{termination_terms}
8. 保密与知识产权：{confidentiality_ip}
9. 争议解决：{dispute_resolution}

## 需确认事项

| 问题 | 影响 | 建议 |
| --- | --- | --- |
| {missing_item} | {impact} | {suggestion} |`,
  },
  {
    id: 'civil-complaint',
    name: '民事起诉状',
    description: '根据诉讼请求与案情陈述，一键生成规范的民事起诉状。',
    shortDescription: 'Draft civil complaints from parties, claims, facts, evidence, jurisdiction, and filing needs.',
    overview:
      '用于把民事纠纷事实整理成法院可读的民事起诉状初稿。重点是让诉讼请求、事实理由、证据目录和管辖依据相互对应。',
    goodFit: [
      '用户需要起诉状初稿，案件类型包括合同、借贷、侵权、租赁等普通民事纠纷。',
      '用户已有案情陈述和证据，需要转成正式诉讼文书。',
      '用户不确定诉讼请求、事实理由和证据如何对应。',
    ],
    workflow: [
      '确认案由、法院、原告、被告、第三人、联系方式和送达地址。',
      '整理诉讼请求，拆分本金、利息、违约金、赔偿、费用承担、行为请求等项目。',
      '按时间线抽取合同签订、履行、违约、催告、损失和协商过程。',
      '为每项诉讼请求匹配事实依据、法律依据方向和证据材料。',
      '生成民事起诉状正文，控制格式为首部、诉讼请求、事实与理由、证据提示、尾部。',
      '列出立案前必须补齐的主体材料、证据材料和金额计算表。',
    ],
    output: [
      '输出民事起诉状初稿，包含当事人、诉请、事实理由、法院和具状人信息。',
      '输出诉讼请求与证据对应表，便于继续整理材料。',
      '对缺少身份证号、住所地、法院、金额计算、证据名称的项目保留占位并提示。',
    ],
    guardrails: [
      '不得编造身份证号、统一社会信用代码、地址、法院名称、案号或证据。',
      '不得把无法证明的事实写成确定事实。',
      '诉讼请求必须具体、可执行，不写空泛的要求赔偿全部损失。',
      '涉及管辖、诉讼时效、仲裁条款和保全时必须提示核验。',
    ],
    referenceName: 'civil-complaint-rules.md',
    referenceContent: `# 民事起诉状规则

## 必备结构

1. 标题：民事起诉状。
2. 当事人信息：自然人写姓名、性别、出生年月、民族、住址、联系方式；法人或组织写名称、住所地、法定代表人。
3. 诉讼请求：逐项编号，金额和计算方式明确。
4. 事实与理由：按时间线和请求权基础组织。
5. 证据提示：列明证据名称和证明目的。
6. 尾部：此致法院、具状人、日期。

## 风险提示

- 管辖法院不确定时不要直接指定。
- 有仲裁条款时提示可能不能直接起诉。
- 超过诉讼时效风险要单独提示。
- 被告主体不明时优先补工商信息或身份信息。`,
    templateName: 'civil-complaint-template.md',
    templateContent: `# 民事起诉状

原告：{plaintiff}

被告：{defendant}

第三人：{third_party}

## 诉讼请求

1. {claim_1}
2. {claim_2}
3. 本案诉讼费用由被告承担。

## 事实与理由

{facts_and_reasons}

## 证据与证明目的

| 证据 | 证明目的 |
| --- | --- |
| {evidence_name} | {proof_purpose} |

此致

{court_name}

具状人：{plaintiff_signature}

{date}

## 立案前待补充

- {missing_item}`,
  },
  {
    id: 'document-writing',
    name: '文书写作',
    description: '格式规范，逻辑严谨，拟一篇公文只要几分钟。',
    shortDescription: 'Draft legal documents with purpose, audience, facts, claims, tone, and review notes.',
    overview:
      '用于通用法律文书和业务公文写作。先确认文书类型、使用对象、作者立场、事实材料、表达语气和交付格式，再生成可编辑草稿。',
    goodFit: [
      '用户要写律师函、法律意见、代理意见、申请书、声明、通知、备忘录或公文。',
      '已有事实和观点，需要转为正式文书。',
      '需要根据法院、客户、对方当事人、内部领导等不同对象调整语气。',
    ],
    workflow: [
      '确认文书类型、使用场景、读者对象、发送主体、目标和语气。',
      '抽取事实、时间线、争议焦点、请求事项、证据和已有依据。',
      '判断是否缺少影响文书成立的关键信息，必要时先输出追问。',
      '生成结构化提纲，保证事实、理由、主张和附件对应。',
      '输出正文草稿，并根据场景控制正式程度、强硬程度和风险提示。',
      '附上修改建议、缺口清单和需人工复核事项。',
    ],
    output: [
      '输出完整文书草稿，不只输出提纲。',
      '说明文书用途、语气策略、关键事实来源和需补充材料。',
      '对可能构成承认、放弃权利或扩大承诺的表述单独提示。',
    ],
    guardrails: [
      '不得编造事实、证据、法条、案号、审批意见或授权。',
      '不得擅自替用户作出和解承诺、付款承诺、事实承认或权利放弃。',
      '不确定的法律依据必须标明待核验，不能包装成已核实引用。',
      '对外发送文书必须提示人工复核主体身份、权限和送达方式。',
    ],
    referenceName: 'document-writing-rules.md',
    referenceContent: `# 文书写作规则

## 写作前确认

| 项目 | 说明 |
| --- | --- |
| 文书类型 | 律师函、法律意见、代理意见、申请书、声明、通知、公文等 |
| 使用对象 | 法院、仲裁委、客户、对方当事人、监管机关、内部团队 |
| 作者身份 | 律师、公司、个人、代理人、部门 |
| 目标 | 催告、说明、请求、抗辩、汇报、留痕、谈判 |
| 语气 | 克制、中性、强硬、协商、正式汇报 |
| 材料 | 事实、证据、合同、法规、案例、既有草稿 |

## 结构原则

1. 先说明文书目的，再陈述事实。
2. 事实和评价分开，避免混写导致歧义。
3. 请求事项要具体，不能只有原则表态。
4. 对外文书避免不必要承认事实。`,
    templateName: 'document-writing-template.md',
    templateContent: `# 文书草稿

## 文书信息

| 项目 | 内容 |
| --- | --- |
| 文书类型 | {document_type} |
| 使用对象 | {recipient} |
| 作者身份 | {author_role} |
| 写作目标 | {goal} |
| 语气 | {tone} |

## 正文

{document_body}

## 附件或证据

- {attachment}

## 需确认事项

| 事项 | 原因 |
| --- | --- |
| {missing_item} | {reason} |`,
  },
  {
    id: 'legal-research-report',
    name: '法律研究报告',
    description: '基于专业知识库的论文专家。',
    shortDescription: 'Produce legal research reports with issue framing, authorities, cases, analysis, risks, and advice.',
    overview:
      '用于复杂法律问题的系统研究和可交付报告。强调问题树、事实变量、法规案例检索、观点比较、结论强度和落地建议。',
    goodFit: [
      '用户需要法律研究报告、专项法律意见基础稿、内部研判材料或客户沟通稿。',
      '问题涉及多部法律、司法解释、案例裁判观点或监管规则。',
      '需要把检索结果整理成可阅读、可复核、可继续写作的报告。',
    ],
    workflow: [
      '确认研究主题、法域、地域、时间范围、交付对象和报告深度。',
      '拆解主问题、子问题、事实变量、争议观点和待检索对象。',
      '制定法规、司法解释、案例、政策、实务观点的检索计划。',
      '整理依据清单，标明效力状态、适用条件和待核验项。',
      '比较不同观点和类案规则，说明对本案或业务场景的影响。',
      '输出结论摘要、正文分析、风险提示、处理建议和资料清单。',
    ],
    output: [
      '输出完整研究报告，包含摘要、研究范围、依据、分析、结论和建议。',
      '复杂问题必须用表格展示问题树、依据和观点差异。',
      '未检索确认的条文、案例和政策必须标注待核验。',
    ],
    guardrails: [
      '不得编造法条、案例案号、法院、裁判日期、政策文号或引用来源。',
      '不得把研究报告写成泛泛普法文章，必须回应研究问题。',
      '不得跳过事实变量直接得出确定结论。',
      '涉及现行有效性、地方政策、最新裁判口径时必须提示实时核验。',
    ],
    referenceName: 'legal-research-report-rules.md',
    referenceContent: `# 法律研究报告规则

## 报告结构

1. 结论摘要。
2. 研究事项与适用场景。
3. 检索范围与资料来源。
4. 核心法律依据。
5. 争议焦点分析。
6. 类案或实务观点。
7. 风险提示。
8. 处理建议。
9. 待核验事项。

## 引用要求

- 法律法规写正式名称、条款和效力状态。
- 案例写案号、法院、裁判日期和裁判要旨；无法确认时不得补写。
- 实务观点要标明来源类型和适用限制。`,
    templateName: 'legal-research-report-template.md',
    templateContent: `# 法律研究报告

## 一、结论摘要

{executive_summary}

## 二、研究事项

{research_question}

## 三、核心依据

| 依据 | 条文/要旨 | 效力/来源 | 适用问题 |
| --- | --- | --- | --- |
| {authority} | {rule} | {status} | {issue} |

## 四、分析论证

{analysis}

## 五、风险与建议

| 风险 | 触发条件 | 建议 |
| --- | --- | --- |
| {risk} | {condition} | {suggestion} |

## 六、待核验事项

- {verification_item}`,
  },
  {
    id: 'similar-case-report',
    name: '类案分析报告',
    description: '文献总结评价，观点深入剖析。',
    shortDescription: 'Build similar-case analysis reports with search strategy, comparison, holdings, and strategy.',
    overview:
      '用于从目标案件出发进行类案检索、筛选、比较和裁判规则提炼。重点是判断案例是否真正可类比，而不是罗列案名。',
    goodFit: [
      '用户需要支持诉讼策略、法律意见、研究报告或文书观点的类案。',
      '目标案件有清晰案由、争议焦点、关键事实和证据结构。',
      '需要比较有利案例、不利案例和差异案例。',
    ],
    workflow: [
      '确认目标案件案由、法院层级、地域、时间范围、争议焦点和希望支持的观点。',
      '生成检索关键词、同义词、排除词和筛选条件。',
      '按事实相似度、争点一致性、法院层级、裁判时间和规则清晰度筛选案例。',
      '逐案提炼基本案情、争议焦点、裁判理由、裁判结果和可引用规则。',
      '比较目标案件与类案的相同点、差异点、有利点和风险点。',
      '输出类案分析报告和诉讼策略建议。',
    ],
    output: [
      '输出检索策略、案例筛选表、类案对比表、裁判规则和策略建议。',
      '每个案例都要说明相似度和能否引用，不能只写案名。',
      '必须列出不利或差异案例，避免选择性呈现。',
    ],
    guardrails: [
      '不得编造案号、法院、裁判日期、裁判结果或裁判观点。',
      '不得只因案由相同就认定为类案。',
      '不得忽略事实差异、证据差异和法院层级差异。',
      '无法确认来源的案例只能列为待核验线索。',
    ],
    referenceName: 'similar-case-analysis-rules.md',
    referenceContent: `# 类案分析规则

## 相似度维度

| 维度 | 说明 |
| --- | --- |
| 法律关系 | 合同、侵权、劳动、婚姻、公司等 |
| 核心事实 | 行为方式、履行过程、违约形态、损害后果 |
| 争议焦点 | 法律适用和事实认定焦点 |
| 证据结构 | 证据类型、证明强度、举证责任 |
| 法院层级 | 最高法、高院、中院、基层法院 |
| 时间 | 是否适用现行规则和当前裁判倾向 |

## 案例分组

- 强相关：事实结构和争议焦点高度一致。
- 可参考：法律问题接近，但事实或证据有差异。
- 仅背景：只能说明一般规则，不宜作为核心依据。
- 不利案例：结论相反或暴露目标案件风险。`,
    templateName: 'similar-case-report-template.md',
    templateContent: `# 类案分析报告

## 一、目标案件

{target_case_summary}

## 二、检索策略

| 项目 | 内容 |
| --- | --- |
| 案由 | {cause_of_action} |
| 争议焦点 | {issues} |
| 关键词 | {keywords} |
| 法院/地域 | {court_scope} |
| 时间范围 | {date_range} |

## 三、类案对比

| 案例 | 案号 | 法院 | 核心事实 | 裁判规则 | 相似度 | 影响 |
| --- | --- | --- | --- | --- | --- | --- |
| {case_name} | {case_no} | {court} | {facts} | {holding} | {similarity} | {impact} |

## 四、不利或差异案例

- {adverse_case}

## 五、诉讼策略建议

{strategy}`,
  },
  {
    id: 'contract-review',
    name: '合同审查',
    description: '多立场、多强弱视角的智能合同审查与风险提示。',
    shortDescription: 'Review contracts by party position, risk level, clause issue, revision, and replacement wording.',
    overview:
      '用于合同片段或完整合同审查。根据用户立场和交易背景识别主体、标的、付款、交付、验收、违约、解除、保密、知识产权和争议解决风险。',
    goodFit: [
      '用户上传或粘贴合同，希望知道风险和修改建议。',
      '需要站在甲方、乙方、买方、卖方、出租方、承租方等立场审查。',
      '需要输出可执行的修订意见或替代条款。',
    ],
    workflow: [
      '确认合同类型、交易背景、用户立场、审查重点和风险偏好。',
      '识别合同结构、核心条款、缺失条款和异常条款。',
      '按主体资格、标的、价款、付款、交付、验收、质量、违约、解除、责任限制、保密、知识产权、数据、合规和争议解决分模块审查。',
      '为每项问题标注风险等级、风险类型、影响后果和触发条件。',
      '给出修改建议，必要时提供可替换条款。',
      '输出需业务确认的问题和后续谈判重点。',
    ],
    output: [
      '输出合同审查报告和风险矩阵。',
      '每个风险必须对应原文条款或缺失条款。',
      '修改建议要能直接交给业务或合同相对方沟通。',
    ],
    guardrails: [
      '不得脱离用户立场泛泛审查。',
      '不得虚构合同没有写明的交易条件。',
      '不得把所有问题都标为高风险。',
      '涉及法律强制性规定、行业监管或跨境事项时必须提示专项核验。',
    ],
    referenceName: 'contract-review-rules.md',
    referenceContent: `# 合同审查规则

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
    templateName: 'contract-review-report-template.md',
    templateContent: `# 合同审查报告

## 一、审查信息

| 项目 | 内容 |
| --- | --- |
| 合同名称 | {contract_name} |
| 用户立场 | {position} |
| 交易背景 | {transaction_background} |

## 二、总体结论

{summary}

## 三、风险矩阵

| 条款 | 风险等级 | 风险类型 | 问题 | 修改建议 | 替代条款 |
| --- | --- | --- | --- | --- | --- |
| {clause} | {level} | {risk_type} | {issue} | {suggestion} | {replacement} |

## 四、缺失条款建议

- {missing_clause}

## 五、需业务确认

- {business_question}`,
  },
  {
    id: 'document-review',
    name: '文书审查',
    description: '自动识别文书类型，按要求进行针对性审查与修改建议。',
    shortDescription: 'Review legal documents for type, claims, facts, evidence, authorities, structure, and enforceability.',
    overview:
      '用于对诉讼文书、法律意见、律师函、合同附件、公文和业务材料进行审查。先识别文书类型和用途，再从内容、法律依据、证据对应、结构格式和表达风险维度输出问题清单。',
    goodFit: [
      '用户已有文书草稿，需要审查是否完整、准确、可提交或可发送。',
      '需要识别诉讼请求、事实理由、证据、法律依据之间是否对应。',
      '需要输出修改建议，而不是直接润色全文。',
    ],
    workflow: [
      '识别文书类型、使用对象、作者立场、交付场景和审查重点。',
      '检查必备要素是否齐全，例如主体、请求、事实、理由、证据、落款、附件。',
      '检查事实与主张、请求与依据、证据与证明目的是否对应。',
      '识别法律依据缺失、引用错误、过度承诺、事实承认和表达歧义。',
      '按高、中、低风险输出问题清单和修改建议。',
      '必要时给出局部替换文本或结构调整方案。',
    ],
    output: [
      '输出文书审查报告、问题清单、修改建议和待补充材料。',
      '每条问题应指出位置、风险、影响和建议。',
      '对可直接修改的表达提供替换文本。',
    ],
    guardrails: [
      '不得替用户补造不存在的事实、证据、案号、法条或授权。',
      '不得只做错别字检查而忽略实体风险。',
      '不得在未确认用途时擅自改变文书立场。',
      '涉及提交法院、监管机关或对外发送的文书必须提示人工复核。',
    ],
    referenceName: 'document-review-rules.md',
    referenceContent: `# 文书审查规则

## 审查维度

| 维度 | 检查点 |
| --- | --- |
| 类型识别 | 文书标题、用途、对象和格式是否匹配 |
| 主体信息 | 名称、身份、授权、地址和联系方式 |
| 请求事项 | 是否明确、具体、可执行 |
| 事实理由 | 时间线、因果关系、争议焦点是否清楚 |
| 法律依据 | 是否缺失、错引、旧法或待核验 |
| 证据对应 | 证据是否支撑关键事实和请求 |
| 表达风险 | 承认事实、放弃权利、过度承诺、歧义 |

## 风险等级

- 高：可能影响提交、胜诉基础、权利义务或法律效果。
- 中：影响论证可信度、可执行性或沟通效果。
- 低：格式、表述、编号、标点和一致性问题。`,
    templateName: 'document-review-report-template.md',
    templateContent: `# 文书审查报告

## 一、基本信息

| 项目 | 内容 |
| --- | --- |
| 文书类型 | {document_type} |
| 使用对象 | {recipient} |
| 用户立场 | {user_position} |
| 审查重点 | {review_focus} |

## 二、总体结论

{summary}

## 三、问题清单

| 位置 | 风险等级 | 问题 | 影响 | 修改建议 |
| --- | --- | --- | --- | --- |
| {location} | {level} | {issue} | {impact} | {suggestion} |

## 四、可替换文本

原文：{original}

建议：{replacement}

## 五、待补充材料

- {missing_item}`,
  },
  {
    id: 'document-correction',
    name: '文档纠错',
    description: '仅针对文本格式规范与文字正确性进行纠错，输出可执行修正建议。',
    shortDescription: 'Proofread documents for typos, punctuation, numbering, formatting, terminology, and consistency.',
    overview:
      '用于文档交付前的基础质量检查。聚焦错别字、漏字、多字、标点、编号、格式、称谓、日期、金额和术语一致性，不做实体法律判断扩展。',
    goodFit: [
      '用户已有文档，需要检查文字和格式错误。',
      '需要输出可逐条执行的修正建议。',
      '需要在不改变原意的情况下统一称谓、编号和格式。',
    ],
    workflow: [
      '确认文档类型、是否允许改写、是否保持原格式和输出方式。',
      '逐段检查错别字、漏字、多字、语病、重复、标点和空格。',
      '检查标题层级、序号、编号、条款引用、表格序号和附件编号。',
      '检查主体称谓、日期格式、金额格式、单位、专有名词和简称一致性。',
      '输出问题位置、原文、建议修改和问题类型。',
      '对可能改变原意的修改标注需确认。',
    ],
    output: [
      '输出纠错清单和可替换文本。',
      '区分文字错误、格式错误、一致性问题和需人工确认项。',
      '保持原意，不做无必要扩写。',
    ],
    guardrails: [
      '不得改变法律立场、事实陈述、金额、日期或承诺内容。',
      '不得新增法条、案例、证据或实体分析。',
      '遇到疑似实体法律问题时只提示需法律审查，不在纠错技能中展开。',
      '不确定是错字还是专有名词时标为需确认。',
    ],
    referenceName: 'document-correction-rules.md',
    referenceContent: `# 文档纠错规则

## 检查类型

| 类型 | 示例 |
| --- | --- |
| 文字错误 | 错别字、漏字、多字、重复词 |
| 标点格式 | 中英文标点混用、空格、括号、引号 |
| 编号层级 | 一、（一）、1.、（1）混乱 |
| 称谓一致 | 甲方/乙方、原告/被告、申请人/被申请人 |
| 数字日期 | 金额大小写、日期格式、百分比、单位 |
| 引用一致 | 条款编号、附件编号、页码、标题引用 |

## 修改原则

- 明确错误直接给建议。
- 可能改变原意的只标注需确认。
- 不做实体法律判断。
- 保留原文风格和格式层级。`,
    templateName: 'document-correction-report-template.md',
    templateContent: `# 文档纠错报告

## 一、总体情况

{summary}

## 二、纠错清单

| 位置 | 类型 | 原文 | 建议 | 说明 |
| --- | --- | --- | --- | --- |
| {location} | {issue_type} | {original} | {replacement} | {note} |

## 三、需人工确认

- {confirmation_item}`,
  },
  {
    id: 'contract-compare',
    name: '合同比对',
    description: '对比两份合同差异，输出条款级差异清单与风险提示。',
    shortDescription: 'Compare two contract versions by clause, legal impact, risk level, and action recommendation.',
    overview:
      '用于两版合同、补充协议、修订稿或谈判稿之间的差异分析。重点识别新增、删除、修改、措辞变化、义务变化、风险转移和谈判让步。',
    goodFit: [
      '用户有原合同和修订版，需要知道改了什么。',
      '需要判断差异是否影响付款、交付、验收、违约、解除、责任、管辖等关键条款。',
      '需要输出条款级差异清单和风险等级。',
    ],
    workflow: [
      '确认基准版本、新版本、用户立场和重点关注条款。',
      '按标题、章节、条款编号和语义内容建立对应关系。',
      '识别新增、删除、修改、移动、拆分、合并和仅格式变化。',
      '判断每项差异对权利义务、金额、期限、责任、举证、解除和争议解决的影响。',
      '按高、中、低风险标注差异，并给出接受、拒绝、谈判或需确认建议。',
      '输出执行摘要、差异表和重点谈判清单。',
    ],
    output: [
      '输出合同比对报告，包含总体变化、重大风险、条款级差异和建议。',
      '对每项差异写清原文、新文、变化类型、影响和建议。',
      '区分实质变化和格式文字变化。',
    ],
    guardrails: [
      '不得只输出文本 diff 而不说明法律或业务影响。',
      '不得忽略条款编号变化导致的引用错位。',
      '无法确认对应关系时必须标注未匹配，不得强行合并。',
      '不得替用户直接接受高风险修改。',
    ],
    referenceName: 'contract-compare-rules.md',
    referenceContent: `# 合同比对规则

## 差异类型

| 类型 | 说明 |
| --- | --- |
| 新增 | 新版本增加条款或义务 |
| 删除 | 新版本删除保护、义务、限制或救济 |
| 修改 | 内容、金额、期限、责任、条件发生变化 |
| 移动 | 条款位置变化但内容基本不变 |
| 拆分/合并 | 原条款被拆为多条或多条合并 |
| 格式变化 | 编号、标点、标题、排版变化 |

## 重点风险

- 付款条件变严或收款保障下降。
- 交付、验收、质量标准变模糊。
- 违约责任降低、责任上限新增或扩大免责。
- 解除权、暂停履行权、单方变更权变化。
- 保密、知识产权、数据、竞业或排他义务增加。
- 管辖、仲裁、适用法律、送达条款变化。`,
    templateName: 'contract-compare-report-template.md',
    templateContent: `# 合同比对报告

## 一、比对信息

| 项目 | 内容 |
| --- | --- |
| 基准版本 | {base_version} |
| 新版本 | {new_version} |
| 用户立场 | {position} |

## 二、总体变化

{summary}

## 三、条款级差异

| 条款 | 变化类型 | 原文 | 新文 | 影响 | 风险 | 建议 |
| --- | --- | --- | --- | --- | --- | --- |
| {clause} | {change_type} | {old_text} | {new_text} | {impact} | {risk_level} | {suggestion} |

## 四、重点谈判项

- {negotiation_item}`,
  },
];

const legalWorkflowSkills: SkillCatalogItem[] = onboardedLegalSkillSeeds.map((skill) => ({
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
  ...recommendedSkills,
]);

export const registeredSkillNames = computed(() => new Set([
  ...availableSkills.value.map((skill) => skill.name),
  ...availableSkills.value.map((skill) => skill.id),
  'skill-creator',
  'template-creator',
]));

export const isRegisteredSkillName = (skillName: string) => registeredSkillNames.value.has(skillName);

export const isRecommendedSkill = (skillId: string) => recommendedSkillIds.has(skillId);

export const isAddedRecommendedSkill = (skillId: string) =>
  recommendedSkillIds.has(skillId) || addedRecommendedSkillIds.value.includes(skillId);

export const addRecommendedSkill = (skillId: string) => {
  if (!recommendedSkillIds.has(skillId)) return false;
  if (isAddedRecommendedSkill(skillId)) return false;

  const nextIds = normalizeAddedSkillIds([...addedRecommendedSkillIds.value, skillId]);
  addedRecommendedSkillIds.value = nextIds;
  writeAddedSkillIds(nextIds);
  return true;
};
