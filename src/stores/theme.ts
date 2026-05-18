import { computed, ref } from 'vue';
import { DEFAULT_THEME_ID, isThemeId, themeOptions, type ThemeId } from '../data/themes';

const THEME_STORAGE_KEY = 'legal-ai-theme-id';

const getStoredThemeId = (): ThemeId => {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME_ID;
  const storedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(storedThemeId) ? storedThemeId : DEFAULT_THEME_ID;
};

const currentThemeId = ref<ThemeId>(getStoredThemeId());

const applyThemeToDocument = (themeId: ThemeId) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = themeId;
};

const persistTheme = (themeId: ThemeId) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, themeId);
};

export const useTheme = () => {
  const currentTheme = computed(() =>
    themeOptions.find((theme) => theme.id === currentThemeId.value) ?? themeOptions[0]!
  );

  const initTheme = () => {
    applyThemeToDocument(currentThemeId.value);
  };

  const setTheme = (themeId: ThemeId) => {
    currentThemeId.value = themeId;
    persistTheme(themeId);
    applyThemeToDocument(themeId);
  };

  return {
    currentTheme,
    currentThemeId,
    initTheme,
    setTheme,
    themeOptions,
  };
};
