import { ref } from 'vue';

export type TemplatePublishDestination = 'group' | 'team' | 'public';
export type TemplatePublishDestinationInput = TemplatePublishDestination | TemplatePublishDestination[];

const templatePublishDestinationsStorageKey = 'legal-version-template-publish-destinations';

const isTemplatePublishDestination = (destination: unknown): destination is TemplatePublishDestination =>
  destination === 'group' || destination === 'team' || destination === 'public';

export const normalizeTemplatePublishDestinationList = (
  destinations: unknown,
): TemplatePublishDestination[] => {
  const values = Array.isArray(destinations) ? destinations : [destinations];
  return Array.from(new Set(values.filter(isTemplatePublishDestination)));
};

const readTemplatePublishDestinations = () => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(templatePublishDestinationsStorageKey) || '{}');
    if (!parsed || typeof parsed !== 'object') return {};

    const entries: Array<[string, TemplatePublishDestination[]]> = [];
    Object.entries(parsed as Record<string, unknown>).forEach(([templateId, destinations]) => {
      const normalized = normalizeTemplatePublishDestinationList(destinations);
      if (normalized.length) {
        entries.push([templateId, normalized]);
      }
    });
    return Object.fromEntries(entries) as Record<string, TemplatePublishDestination[]>;
  } catch {
    return {};
  }
};

const templatePublishDestinations = ref<Record<string, TemplatePublishDestination[]>>(
  readTemplatePublishDestinations(),
);

const persistTemplatePublishDestinations = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    templatePublishDestinationsStorageKey,
    JSON.stringify(templatePublishDestinations.value),
  );
};

export const getTemplatePublishDestinations = (templateId: string) =>
  templatePublishDestinations.value[templateId] ?? [];

export const hasTemplatePublishDestination = (
  templateId: string,
  destination: TemplatePublishDestination,
) => getTemplatePublishDestinations(templateId).includes(destination);

export const publishTemplateToMarket = (
  templateId: string,
  destinations: TemplatePublishDestinationInput,
) => {
  const publishDestinations = normalizeTemplatePublishDestinationList(destinations);
  if (!templateId || !publishDestinations.length) return false;

  const previousDestinations = getTemplatePublishDestinations(templateId);
  templatePublishDestinations.value = {
    ...templatePublishDestinations.value,
    [templateId]: publishDestinations,
  };
  persistTemplatePublishDestinations();

  return previousDestinations.join('|') !== publishDestinations.join('|');
};
