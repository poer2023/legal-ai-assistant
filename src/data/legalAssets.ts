import {
  defaultDocumentIds,
  getDocumentTemplateEntries,
  getDocumentTemplateIds,
  isDefaultDocument,
  nonLitigationDocuments,
  renderDocumentTemplateMarkdown,
  type DocumentSection,
} from './nonLitigationDocuments';

export interface SkillAsset {
  id: string;
  name: string;
  category: string;
  scenario: string;
  inputs: string;
  output: string;
  agents: string[];
  templateIds: string[];
  routeName: string;
  tags: string[];
  featured?: boolean;
  recent?: boolean;
}

export interface TemplateAsset {
  id: string;
  name: string;
  docType: string;
  source: string;
  applicableSkills: string[];
  agent: string;
  requiredFields: string[];
  preview: string;
  routeName: string;
  tags: string[];
  updatedAt: string;
  documentSections?: TemplateDocumentSection[];
}

export type TemplateDocumentSection = DocumentSection;

export interface SkillTemplateOption extends TemplateAsset {
  origin: 'asset' | 'skill-file';
  content?: string;
  filePath?: string;
}

type SkillTemplateSource = {
  id?: string;
  name: string;
  routeName?: string;
  templateIds?: string[];
  agents?: string[];
  tags?: string[];
  files?: Array<{
    id: string;
    name: string;
    path: string;
    type: string;
    content: string;
  }>;
};

export const skillAssets: SkillAsset[] = nonLitigationDocuments.map((document, index) => ({
  id: document.id,
  name: document.skillName,
  category: document.category,
  scenario: document.scenario,
  inputs: document.inputs,
  output: document.output,
  agents: [document.skillName],
  templateIds: getDocumentTemplateIds(document),
  routeName: document.routeName,
  tags: document.tags,
  featured: isDefaultDocument(document.id),
  recent: isDefaultDocument(document.id) && index < 4,
}));

export const templateAssets: TemplateAsset[] = nonLitigationDocuments.flatMap((document) =>
  getDocumentTemplateEntries(document).map((template) => ({
    id: template.id,
    name: template.name,
    docType: document.category,
    source: isDefaultDocument(document.id) ? '默认模板' : '官方推荐',
    applicableSkills: [document.skillName],
    agent: document.skillName,
    requiredFields: template.requiredFields,
    preview: template.preview,
    routeName: document.routeName,
    tags: Array.from(new Set([...document.tags, ...template.tags])),
    updatedAt: document.updatedAt,
    documentSections: template.documentSections,
  })),
);

export const findTemplatesByIds = (ids: string[]) =>
  ids
    .map((id) => templateAssets.find((template) => template.id === id))
    .filter((template): template is TemplateAsset => Boolean(template));

export const defaultTemplateIds: string[] = nonLitigationDocuments
  .filter((document) => defaultDocumentIds.includes(document.id as (typeof defaultDocumentIds)[number]))
  .flatMap(getDocumentTemplateIds);

export const defaultTemplateAssets = findTemplatesByIds(defaultTemplateIds);

export const officialTemplateAssets = templateAssets.filter(
  (template) => !defaultTemplateIds.includes(template.id)
);

const toAssetTemplateOption = (template: TemplateAsset): SkillTemplateOption => ({
  ...template,
  origin: 'asset',
});

const extractTemplateFields = (content: string) => {
  const placeholders = Array.from(content.matchAll(/\{([^{}\n]+)\}/g))
    .map((match) => match[1]?.trim())
    .filter((field): field is string => Boolean(field));

  return Array.from(new Set(placeholders)).slice(0, 12);
};

const extractMarkdownTitle = (content: string, fallback: string) => {
  const heading = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^#\s+/.test(line));

  return heading?.replace(/^#\s+/, '').trim() || fallback.replace(/\.(md|markdown|txt)$/i, '');
};

const parseMarkdownTable = (lines: string[], startIndex: number) => {
  const parseRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  const isDivider = (line: string) =>
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());

  const dividerLine = lines[startIndex + 1];
  const headerLine = lines[startIndex];
  if (!headerLine || !dividerLine || !isDivider(dividerLine)) return null;

  const headers = parseRow(headerLine);
  const rows: string[][] = [];
  let index = startIndex + 2;

  while (index < lines.length) {
    const rowLine = lines[index];
    if (!rowLine?.trim().startsWith('|')) break;
    rows.push(parseRow(rowLine));
    index += 1;
  }

  return {
    table: { headers, rows },
    nextIndex: index,
  };
};

const parseTemplateDocumentSections = (content: string): TemplateDocumentSection[] => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const sections: TemplateDocumentSection[] = [];
  let current: TemplateDocumentSection | null = null;
  let index = 0;

  const ensureSection = () => {
    if (!current) {
      current = { title: '模板正文', paragraphs: [] };
      sections.push(current);
    }
    return current;
  };

  while (index < lines.length) {
    const rawLine = lines[index] ?? '';
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      index += 1;
      continue;
    }

    const heading = line.match(/^#{2,6}\s+(.+)$/);
    if (heading) {
      current = { title: (heading[1] ?? '模板正文').trim(), paragraphs: [] };
      sections.push(current);
      index += 1;
      continue;
    }

    const tableResult = line.startsWith('|') ? parseMarkdownTable(lines, index) : null;
    if (tableResult) {
      const section = ensureSection();
      if (section.table) {
        sections.push({
          title: `${section.title}表格`,
          table: tableResult.table,
        });
      } else {
        section.table = tableResult.table;
      }
      index = tableResult.nextIndex;
      continue;
    }

    const section = ensureSection();
    section.paragraphs = [...(section.paragraphs ?? []), rawLine.trim()];
    index += 1;
  }

  return sections.length ? sections : [{ title: '模板正文', paragraphs: [content] }];
};

const createFileTemplateOption = (
  skill: SkillTemplateSource,
  file: NonNullable<SkillTemplateSource['files']>[number],
): SkillTemplateOption => {
  const fields = extractTemplateFields(file.content);
  const templateName = extractMarkdownTitle(file.content, file.name);
  const firstBodyLine = file.content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#') && !line.startsWith('|') && !/^-+$/.test(line));

  return {
    id: `${skill.id ?? skill.name}-${file.id}`,
    name: templateName,
    docType: '技能内置模板',
    source: '技能包',
    applicableSkills: [skill.name],
    agent: skill.name,
    requiredFields: fields.length ? fields : ['正文内容'],
    preview: firstBodyLine || `来自 ${file.path} 的标准输出格式模板。`,
    routeName: skill.routeName ?? 'home',
    tags: Array.from(new Set(['输出格式', '技能内置', ...(skill.tags ?? [])])),
    updatedAt: '技能包',
    origin: 'skill-file',
    content: file.content,
    filePath: file.path,
    documentSections: parseTemplateDocumentSections(file.content),
  };
};

export const getTemplatesForSkill = (skill: SkillTemplateSource): SkillTemplateOption[] => {
  const linkedSkillAsset = skillAssets.find((asset) =>
    asset.id === skill.id ||
    asset.name === skill.name ||
    asset.agents.includes(skill.name)
  );

  const linkedTemplateIds = [
    ...(skill.templateIds ?? []),
    ...(linkedSkillAsset?.templateIds ?? []),
  ];

  const assetTemplates = [
    ...findTemplatesByIds(Array.from(new Set(linkedTemplateIds))),
    ...templateAssets.filter((template) =>
      template.applicableSkills.includes(skill.name) || template.agent === skill.name
    ),
  ];

  const fileTemplates = (skill.files ?? [])
    .filter((file) => file.type === 'template')
    .map((file) => createFileTemplateOption(skill, file));

  const seen = new Set<string>();
  const seenDisplayNames = new Set<string>();
  return [...assetTemplates.map(toAssetTemplateOption), ...fileTemplates].filter((template) => {
    if (seen.has(template.id)) return false;
    const displayKey = `${template.agent}:${template.name}`;
    if (seenDisplayNames.has(displayKey)) return false;
    seen.add(template.id);
    seenDisplayNames.add(displayKey);
    return true;
  });
};

export const getTemplateMarkdown = (templateId: string) => {
  const document = nonLitigationDocuments.find((item) => getDocumentTemplateIds(item).includes(templateId));
  const template = document ? getDocumentTemplateEntries(document).find((item) => item.id === templateId) : null;
  return document && template ? renderDocumentTemplateMarkdown(document, template) : '';
};
