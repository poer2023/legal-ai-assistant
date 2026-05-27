import { computed, ref } from 'vue';

export type ProjectStatus = 'active' | 'archived';

export type ProjectMember = {
  name: string;
  role: string;
};

export type LegalProject = {
  id: string;
  name: string;
  client: string;
  description: string;
  status: ProjectStatus;
  updatedAt: string;
  owner: string;
  members: ProjectMember[];
  files: number;
  chats: number;
  skills: string[];
};

const PROJECTS_STORAGE_KEY = 'legal-demo-projects-v1';
const ACTIVE_PROJECT_STORAGE_KEY = 'legal-demo-active-project-v1';

const seedProjects: LegalProject[] = [
  {
    id: 'project-hongsheng-contract',
    name: '合同审查与红线生成',
    client: '鸿盛地产',
    description: '地产项目商事合同审查，生成风险清单、红线版合同与谈判口径。',
    status: 'active',
    updatedAt: '今天 16:20',
    owner: '唐予安',
    members: [
      { name: '唐予安', role: '负责人' },
      { name: '周知行', role: '合同审查' },
      { name: '陆明薇', role: '合规复核' },
    ],
    files: 28,
    chats: 12,
    skills: ['合同审查与红线生成', '法规差距分析助手'],
  },
  {
    id: 'project-haikang-ma',
    name: '并购尽调与交易文件',
    client: '海康并购案',
    description: '围绕股权收购的尽调、SPA 条款审阅、交割条件和披露函生成。',
    status: 'active',
    updatedAt: '昨天 21:10',
    owner: '顾明远',
    members: [
      { name: '顾明远', role: '项目合伙人' },
      { name: '孙启明', role: '交易文件' },
    ],
    files: 46,
    chats: 18,
    skills: ['SPA 起草', '类案检索分析报告'],
  },
  {
    id: 'project-unlinked',
    name: '创建合同审查技能',
    client: '未关联',
    description: '沉淀个人技能，整理合同审查流程、输入要求和输出模板。',
    status: 'active',
    updatedAt: '3 天前',
    owner: 'sinder',
    members: [{ name: 'sinder', role: '创建者' }],
    files: 6,
    chats: 5,
    skills: ['技能创建助手'],
  },
  {
    id: 'project-archive-labor',
    name: '劳动争议证据清单',
    client: '星河科技',
    description: '历史劳动争议事项，保留证据目录和庭审材料。',
    status: 'archived',
    updatedAt: '4 月 18 日',
    owner: '方谨行',
    members: [{ name: '方谨行', role: '负责人' }],
    files: 19,
    chats: 7,
    skills: ['劳动争议证据清单'],
  },
];

const getSafeStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const isProject = (value: unknown): value is LegalProject => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LegalProject>;
  return Boolean(
    typeof item.id === 'string'
    && item.id
    && typeof item.name === 'string'
    && item.name
    && typeof item.client === 'string'
    && Array.isArray(item.members)
    && Array.isArray(item.skills)
  );
};

const readProjects = () => {
  const storage = getSafeStorage();
  if (!storage) return seedProjects;

  try {
    const parsed = JSON.parse(storage.getItem(PROJECTS_STORAGE_KEY) || '[]');
    const items = Array.isArray(parsed) ? parsed.filter(isProject) : [];
    return items.length ? items : seedProjects;
  } catch {
    return seedProjects;
  }
};

const projects = ref<LegalProject[]>(readProjects());
const activeProjectId = ref(getSafeStorage()?.getItem(ACTIVE_PROJECT_STORAGE_KEY) || '');

const persistProjects = () => {
  getSafeStorage()?.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects.value));
};

const persistActiveProject = () => {
  getSafeStorage()?.setItem(ACTIVE_PROJECT_STORAGE_KEY, activeProjectId.value);
};

const createProjectId = (name: string) =>
  `project-${name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || Date.now().toString(36)}`;

export const useProjects = () => {
  const activeProject = computed(() =>
    projects.value.find((project) => project.id === activeProjectId.value) ?? null,
  );
  const activeProjects = computed(() => projects.value.filter((project) => project.status === 'active'));
  const archivedProjects = computed(() => projects.value.filter((project) => project.status === 'archived'));

  const setActiveProject = (projectId: string) => {
    activeProjectId.value = projectId;
    persistActiveProject();
  };

  const clearActiveProject = () => {
    activeProjectId.value = '';
    persistActiveProject();
  };

  const createProject = (payload: Pick<LegalProject, 'name' | 'client' | 'description'>) => {
    const project: LegalProject = {
      id: createProjectId(`${payload.client}-${payload.name}`),
      name: payload.name.trim() || '未命名项目',
      client: payload.client.trim() || '未关联',
      description: payload.description.trim() || '新的法律项目',
      status: 'active',
      updatedAt: '刚刚',
      owner: 'sinder',
      members: [{ name: 'sinder', role: '负责人' }],
      files: 0,
      chats: 0,
      skills: [],
    };
    projects.value = [project, ...projects.value];
    activeProjectId.value = project.id;
    persistProjects();
    persistActiveProject();
    return project;
  };

  return {
    activeProject,
    activeProjectId,
    activeProjects,
    archivedProjects,
    clearActiveProject,
    createProject,
    projects,
    setActiveProject,
  };
};
