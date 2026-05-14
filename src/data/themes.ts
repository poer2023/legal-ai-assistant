export type ThemeId = 'classic' | 'codex-theme-v1' | 'absolutely-theme-v1' | 'happycapy-paper-v1';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  codeThemeId: string;
  variant: 'light';
  theme: {
    accent: string;
    contrast: number;
    fonts: {
      code: string | null;
      ui: string | null;
    };
    ink: string;
    opaqueWindows: boolean;
    semanticColors: {
      diffAdded: string;
      diffRemoved: string;
      skill: string;
    };
    surface: string;
  };
}

export const DEFAULT_THEME_ID: ThemeId = 'classic';

export const themeOptions: ThemeDefinition[] = [
  {
    id: 'classic',
    name: '原版主题',
    description: '保留当前法律版蓝色侧栏与浅蓝操作反馈。',
    codeThemeId: 'legal-classic',
    variant: 'light',
    theme: {
      accent: '#2563eb',
      contrast: 45,
      fonts: {
        code: null,
        ui: null,
      },
      ink: '#1f2937',
      opaqueWindows: false,
      semanticColors: {
        diffAdded: '#16a34a',
        diffRemoved: '#dc2626',
        skill: '#2563eb',
      },
      surface: '#ffffff',
    },
  },
  {
    id: 'codex-theme-v1',
    name: 'Codex',
    description: '白色界面、近黑正文、Codex 蓝强调色，适合作为新增主题。',
    codeThemeId: 'codex',
    variant: 'light',
    theme: {
      accent: '#0169cc',
      contrast: 45,
      fonts: {
        code: null,
        ui: null,
      },
      ink: '#0d0d0d',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#00a240',
        diffRemoved: '#e02e2a',
        skill: '#751ed9',
      },
      surface: '#ffffff',
    },
  },
  {
    id: 'absolutely-theme-v1',
    name: 'Absolutely',
    description: '暖白界面、深灰正文、粉棕强调色，适合作为另一套浅色主题。',
    codeThemeId: 'absolutely',
    variant: 'light',
    theme: {
      accent: '#cc7d5e',
      contrast: 45,
      fonts: {
        code: null,
        ui: null,
      },
      ink: '#2d2d2b',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#00c853',
        diffRemoved: '#ff5f38',
        skill: '#cc7d5e',
      },
      surface: '#f9f9f7',
    },
  },
  {
    id: 'happycapy-paper-v1',
    name: 'Happycapy Paper',
    description: '米白纸面、黑色胶囊主按钮、橙色小面积强调，来自 Happycapy 首页风格。',
    codeThemeId: 'happycapy-paper',
    variant: 'light',
    theme: {
      accent: '#000000',
      contrast: 45,
      fonts: {
        code: null,
        ui: null,
      },
      ink: '#2b2b2b',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#2f8f4e',
        diffRemoved: '#c2410c',
        skill: '#ff6b4a',
      },
      surface: '#f9f6f1',
    },
  },
];

export const isThemeId = (value: string | null | undefined): value is ThemeId =>
  value === 'classic' ||
  value === 'codex-theme-v1' ||
  value === 'absolutely-theme-v1' ||
  value === 'happycapy-paper-v1';
