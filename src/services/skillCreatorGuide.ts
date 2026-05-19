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

export type SkillCreatorGuideAnswer = {
  field: SkillCreatorGuideField;
  title: string;
  label: string;
  description?: string;
  assets?: Array<{
    name: string;
    sourceLabel: string;
    kind: string;
  }>;
};

type SkillCreatorGuideResponse = {
  options?: SkillCreatorGuideOption[];
  steps?: SkillCreatorGuideStep[];
  complete?: boolean;
  analysis?: string;
  missing?: string[];
  nextStep?: SkillCreatorGuideStep | null;
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

export type SkillCreatorIntakeEvaluationResult = {
  complete: boolean;
  analysis: string;
  missing: string[];
  nextStep: SkillCreatorGuideStep | null;
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

export const evaluateSkillCreatorIntake = async ({
  currentText,
  answers,
}: {
  currentText: string;
  answers: SkillCreatorGuideAnswer[];
}): Promise<SkillCreatorIntakeEvaluationResult> => {
  const data = await postSkillCreatorGuide({
    mode: 'intake-evaluation',
    currentText,
    answers,
  });

  const nextStep = data?.nextStep && data.nextStep.field && data.nextStep.title && Array.isArray(data.nextStep.options)
    ? data.nextStep
    : null;

  if (data?.complete !== true && !nextStep) {
    throw new Error(data?.error || '需求完整度评估没有返回下一步问题');
  }

  return {
    complete: data?.complete === true,
    analysis: typeof data?.analysis === 'string' && data.analysis.trim()
      ? data.analysis.trim()
      : '已根据当前输入和补充选项完成一次需求完整度判断。',
    missing: Array.isArray(data?.missing)
      ? data.missing.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 5)
      : [],
    nextStep,
    fallbackUsed: Boolean(data?.fallbackUsed),
    error: data?.error,
    model: data?.model,
  };
};
