import { computed, ref } from 'vue';
import { DEFAULT_THEME_ID, themeOptions, type ThemeId } from '../data/themes';

const currentThemeId = ref<ThemeId>(DEFAULT_THEME_ID);

const applyThemeToDocument = (themeId: ThemeId) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = themeId;
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
