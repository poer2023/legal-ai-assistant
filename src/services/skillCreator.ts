import type { SkillCatalogItem } from '../data/skillCatalog';

export type SkillCreatorAnswers = {
  scenario: string;
  source: string;
  output: string;
  scope: string;
};

export const createSkillWithSkillCreator = async (
  brief: string,
  answers: SkillCreatorAnswers,
): Promise<SkillCatalogItem> => {
  const response = await fetch('/api/skill-creator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ brief, answers }),
  });

  const data = await response.json().catch(() => null) as { skill?: SkillCatalogItem; error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error || `skill-creator 创建失败 (${response.status})`);
  }

  if (!data?.skill) {
    throw new Error('skill-creator 创建结果为空');
  }

  return data.skill;
};
