export type ThemeId =
  | 'classic'
  | 'codex-theme-v1'
  | 'absolutely-theme-v1'
  | 'happycapy-paper-v1'
  | 'lawagents-standalone-v1';

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

export const DEFAULT_THEME_ID: ThemeId = 'lawagents-standalone-v1';

export const themeOptions: ThemeDefinition[] = [
  {
    id: 'classic',
    name: '原版主题',
    description: '沿用暖白主题的紧凑工作台布局，切换为清爽蓝色配色。',
    codeThemeId: 'legal-classic',
    variant: 'light',
    theme: {
      accent: '#2563eb',
      contrast: 45,
      fonts: {
        code: null,
        ui: null,
      },
      ink: '#111827',
      opaqueWindows: false,
      semanticColors: {
        diffAdded: '#16a34a',
        diffRemoved: '#dc2626',
        skill: '#2563eb',
      },
      surface: '#f8fafc',
    },
  },
  {
    id: 'codex-theme-v1',
    name: 'Codex',
    description: '沿用暖白主题的字号、间距与组件尺寸，切换为纯白 Codex 蓝配色。',
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
    description: '沿用暖白主题的工作台骨架，切换为象牙底与粉棕强调色。',
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
    description: '沿用暖白主题的组件节奏，切换为米白纸面、黑色主控与橙色强调。',
    codeThemeId: 'happycapy-paper',
    variant: 'light',
    theme: {
      accent: '#000000',
      contrast: 45,
      fonts: {
        code: null,
        ui: null,
      },
      ink: '#111111',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#2f8f4e',
        diffRemoved: '#c2410c',
        skill: '#ff6b4a',
      },
      surface: '#f9f6f1',
    },
  },
  {
    id: 'lawagents-standalone-v1',
    name: 'LawAgents Standalone',
    description: '基准 LawAgents 主题：白色纸面、墨色强调与紧凑工作台节奏。',
    codeThemeId: 'lawagents-standalone',
    variant: 'light',
    theme: {
      accent: '#2b2522',
      contrast: 45,
      fonts: {
        code: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
        ui: "'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
      },
      ink: '#1a1614',
      opaqueWindows: true,
      semanticColors: {
        diffAdded: '#4a423d',
        diffRemoved: '#b23a3a',
        skill: '#2b2522',
      },
      surface: '#ffffff',
    },
  },
];

export const isThemeId = (value: string | null | undefined): value is ThemeId =>
  value === 'classic' ||
  value === 'codex-theme-v1' ||
  value === 'absolutely-theme-v1' ||
  value === 'happycapy-paper-v1' ||
  value === 'lawagents-standalone-v1';
