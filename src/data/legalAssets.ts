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

export const skillAssets: SkillAsset[] = nonLitigationDocuments.map((document, index) => ({
  id: document.id,
  name: document.skillName,
  category: document.category,
  scenario: document.scenario,
  inputs: document.inputs,
  output: document.output,
  agents: [document.skillName],
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

export const getTemplateMarkdown = (templateId: string) => {
  const document = nonLitigationDocuments.find((item) => getDocumentTemplateIds(item).includes(templateId));
  const template = document ? getDocumentTemplateEntries(document).find((item) => item.id === templateId) : null;
  return document && template ? renderDocumentTemplateMarkdown(document, template) : '';
};
