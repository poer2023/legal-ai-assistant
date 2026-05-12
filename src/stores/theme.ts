import { computed, ref } from 'vue';
import { DEFAULT_THEME_ID, isThemeId, themeOptions, type ThemeId } from '../data/themes';

const STORAGE_KEY = 'legal-ui-theme-id';

const getSafeStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const readThemeId = (): ThemeId => {
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_THEME_ID;

  const savedThemeId = storage.getItem(STORAGE_KEY);
  return isThemeId(savedThemeId) ? savedThemeId : DEFAULT_THEME_ID;
};

const currentThemeId = ref<ThemeId>(readThemeId());

const applyThemeToDocument = (themeId: ThemeId) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = themeId;
};

const persistThemeId = (themeId: ThemeId) => {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, themeId);
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
    persistThemeId(themeId);
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
