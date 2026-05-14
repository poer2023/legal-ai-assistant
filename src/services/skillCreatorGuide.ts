export type SkillCreatorGuideField = string;

export type SkillCreatorGuideOption = {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
};

export type SkillCreatorGuideAssetSlot = {
  id: string;
  type: 'draft' | 'template';
  title: string;
  description: string;
  optional?: boolean;
  allowLocal?: boolean;
  allowKnowledge?: boolean;
  allowTemplate?: boolean;
};

export type SkillCreatorGuideStep = {
  field: SkillCreatorGuideField;
  title: string;
  options: SkillCreatorGuideOption[];
  assetSlots?: SkillCreatorGuideAssetSlot[];
};

type SkillCreatorGuideResponse = {
  options?: SkillCreatorGuideOption[];
  steps?: SkillCreatorGuideStep[];
  error?: string;
  fallbackUsed?: boolean;
  model?: string;
};

export type SkillCreatorRootOptionsResult = {
  options: SkillCreatorGuideOption[];
  fallbackUsed: boolean;
  error?: string;
  model?: string;
};

export type SkillCreatorQuestionPlanResult = {
  steps: SkillCreatorGuideStep[];
  fallbackUsed: boolean;
  error?: string;
  model?: string;
};

const postSkillCreatorGuide = async (body: Record<string, unknown>) => {
  const response = await fetch('/api/skill-creator-guide-options', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null) as SkillCreatorGuideResponse | null;
  if (!response.ok) {
    throw new Error(data?.error || `selector 生成失败 (${response.status})`);
  }

  return data;
};

export const generateSkillCreatorRootOptions = async (
  currentText: string,
): Promise<SkillCreatorRootOptionsResult> => {
  const data = await postSkillCreatorGuide({
    mode: 'root-options',
    currentText,
  });

  if (!Array.isArray(data?.options) || data.options.length === 0) {
    throw new Error(data?.error || '根需求候选生成结果为空');
  }

  return {
    options: data.options
      .filter((option) => option && option.id && option.label && option.description)
      .slice(0, 6),
    fallbackUsed: Boolean(data.fallbackUsed),
    error: data.error,
    model: data.model,
  };
};

export const generateSkillCreatorQuestionPlan = async ({
  currentText,
  rootNeed,
}: {
  currentText: string;
  rootNeed: { label: string; description: string };
}): Promise<SkillCreatorQuestionPlanResult> => {
  const data = await postSkillCreatorGuide({
    mode: 'followup-plan',
    currentText,
    rootNeed,
  });

  if (!Array.isArray(data?.steps) || data.steps.length === 0) {
    throw new Error(data?.error || '后续问题生成结果为空');
  }

  return {
    steps: data.steps
      .filter((step) => step && step.field && step.title && Array.isArray(step.options))
      .slice(0, 4),
    fallbackUsed: Boolean(data.fallbackUsed),
    error: data.error,
    model: data.model,
  };
};
