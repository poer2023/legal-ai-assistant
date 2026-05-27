<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Archive,
  Check,
  FileText,
  FolderPlus,
  MessageSquareText,
  Plus,
  Search,
  Star,
  Users,
  X,
} from 'lucide-vue-next';
import { type LegalProject, useProjects } from '../stores/projects';

const router = useRouter();
const {
  activeProjectId,
  activeProjects,
  archivedProjects,
  clearActiveProject,
  createProject,
  projects,
  setActiveProject,
} = useProjects();

const keyword = ref('');
const activeTab = ref<'recent' | 'mine' | 'joined' | 'archived'>('recent');
const selectedProjectId = ref('');
const showCreate = ref(false);
const draftName = ref('合同审查与红线生成');
const draftClient = ref('鸿盛地产');
const draftDescription = ref('地产项目商事合同审查，生成风险清单、红线版合同与谈判口径。');

const tabs = computed(() => [
  { id: 'recent' as const, label: '最近', count: activeProjects.value.length },
  { id: 'mine' as const, label: '我创建的', count: projects.value.filter((project) => project.owner === 'sinder').length },
  { id: 'joined' as const, label: '我参与的', count: projects.value.filter((project) => project.members.some((member) => member.name !== project.owner)).length },
  { id: 'archived' as const, label: '已归档', count: archivedProjects.value.length },
]);

const filteredProjects = computed(() => {
  const base = activeTab.value === 'archived' ? archivedProjects.value : activeProjects.value;
  const normalized = keyword.value.trim().toLowerCase();
  return base.filter((project) => {
    const text = `${project.client} ${project.name} ${project.description} ${project.owner}`.toLowerCase();
    return !normalized || text.includes(normalized);
  });
});

const selectedProject = computed(() =>
  projects.value.find((project) => project.id === selectedProjectId.value) ?? filteredProjects.value[0] ?? null,
);

const selectProject = (project: LegalProject) => {
  selectedProjectId.value = project.id;
};

const useProject = (project: LegalProject) => {
  setActiveProject(project.id);
  void router.push({ name: 'home' });
};

const submitCreate = () => {
  const project = createProject({
    name: draftName.value,
    client: draftClient.value,
    description: draftDescription.value,
  });
  selectedProjectId.value = project.id;
  showCreate.value = false;
};
</script>

<template>
  <section class="projects-page">
    <header class="projects-header">
      <div>
        <h1>项目</h1>
        <p>把会话、底稿、技能和定时任务按案件或客户事项组织起来。</p>
      </div>
      <button type="button" class="primary-action" @click="showCreate = true">
        <FolderPlus :size="15" />
        <span>新建项目</span>
      </button>
    </header>

    <div class="projects-toolbar">
      <nav class="projects-tabs" aria-label="项目分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ tab.count }}</strong>
        </button>
      </nav>
      <label class="project-search">
        <Search :size="15" />
        <input v-model="keyword" type="search" placeholder="搜索项目、客户或负责人" />
      </label>
    </div>

    <main class="projects-grid">
      <section class="project-list" aria-label="项目列表">
        <button
          v-for="project in filteredProjects"
          :key="project.id"
          type="button"
          class="project-row"
          :class="{ selected: selectedProject?.id === project.id, active: activeProjectId === project.id }"
          @click="selectProject(project)"
        >
          <span class="project-favorite"><Star :size="14" /></span>
          <span class="project-copy">
            <strong>{{ project.client }} · {{ project.name }}</strong>
            <small>{{ project.description }}</small>
          </span>
          <span class="project-meta">{{ project.updatedAt }}</span>
        </button>
      </section>

      <aside v-if="selectedProject" class="project-detail">
        <div class="project-detail-top">
          <span class="project-kicker">{{ selectedProject.client }}</span>
          <h2>{{ selectedProject.name }}</h2>
          <p>{{ selectedProject.description }}</p>
        </div>

        <div class="project-stats">
          <div>
            <FileText :size="16" />
            <strong>{{ selectedProject.files }}</strong>
            <span>项目文件</span>
          </div>
          <div>
            <MessageSquareText :size="16" />
            <strong>{{ selectedProject.chats }}</strong>
            <span>相关会话</span>
          </div>
          <div>
            <Users :size="16" />
            <strong>{{ selectedProject.members.length }}</strong>
            <span>成员</span>
          </div>
        </div>

        <section class="project-side-section">
          <h3>成员</h3>
          <div class="member-list">
            <span v-for="member in selectedProject.members" :key="`${member.name}-${member.role}`">
              <strong>{{ member.name }}</strong>
              <small>{{ member.role }}</small>
            </span>
          </div>
        </section>

        <section class="project-side-section">
          <h3>常用技能</h3>
          <div class="skill-list">
            <span v-for="skill in selectedProject.skills" :key="skill">{{ skill }}</span>
            <span v-if="selectedProject.skills.length === 0">暂无绑定技能</span>
          </div>
        </section>

        <div class="project-actions">
          <button type="button" class="primary-action" @click="useProject(selectedProject)">
            <Check :size="15" />
            <span>{{ activeProjectId === selectedProject.id ? '已关联到首页' : '关联到首页' }}</span>
          </button>
          <button v-if="activeProjectId === selectedProject.id" type="button" class="secondary-action" @click="clearActiveProject">
            <X :size="15" />
            <span>取消关联</span>
          </button>
        </div>
      </aside>

      <aside v-else class="project-empty">
        <Archive :size="20" />
        <span>暂无项目</span>
      </aside>
    </main>

    <div v-if="showCreate" class="project-modal-backdrop" @click.self="showCreate = false">
      <form class="project-modal" @submit.prevent="submitCreate">
        <header>
          <h2>新建项目</h2>
          <button type="button" aria-label="关闭" @click="showCreate = false">
            <X :size="17" />
          </button>
        </header>
        <label>
          <span>客户 / 事项</span>
          <input v-model="draftClient" required maxlength="32" />
        </label>
        <label>
          <span>项目名称</span>
          <input v-model="draftName" required maxlength="42" />
        </label>
        <label>
          <span>项目说明</span>
          <textarea v-model="draftDescription" rows="4" maxlength="180"></textarea>
        </label>
        <footer>
          <button type="button" class="secondary-action" @click="showCreate = false">取消</button>
          <button type="submit" class="primary-action">
            <Plus :size="15" />
            <span>创建项目</span>
          </button>
        </footer>
      </form>
    </div>
  </section>
</template>

<style scoped>
.projects-page {
  min-height: 100%;
  padding: 42px 56px 56px;
  background: var(--bg-color);
  color: var(--text-main);
}

.projects-header,
.projects-toolbar,
.project-detail-top,
.project-actions,
.project-modal header,
.project-modal footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.projects-header h1,
.project-detail h2,
.project-modal h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 30px;
  font-weight: 760;
  letter-spacing: 0;
}

.projects-header p,
.project-detail p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.primary-action,
.secondary-action {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.primary-action {
  background: var(--text-strong);
  color: var(--card-bg);
}

.secondary-action {
  border: 1px solid var(--border-color);
  color: var(--text-main);
  background: var(--card-bg);
}

.projects-toolbar {
  margin-top: 34px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-soft);
}

.projects-tabs {
  display: flex;
  align-items: center;
  gap: 20px;
}

.projects-tabs button {
  position: relative;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 720;
}

.projects-tabs button.active {
  color: var(--text-strong);
}

.projects-tabs button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -17px;
  height: 2px;
  border-radius: 999px;
  background: var(--text-strong);
}

.projects-tabs strong {
  min-width: 21px;
  height: 21px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-soft);
  font-size: 11px;
}

.project-search {
  width: min(340px, 38vw);
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-muted);
  background: var(--card-bg);
}

.project-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-main);
}

.projects-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 28px;
  margin-top: 22px;
}

.project-list {
  display: grid;
  gap: 7px;
}

.project-row {
  min-height: 72px;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-main);
  background: transparent;
  text-align: left;
}

.project-row:hover,
.project-row.selected {
  border-color: var(--border-color);
  background: var(--card-bg);
}

.project-row.active {
  border-color: var(--text-strong);
}

.project-favorite {
  color: var(--text-muted);
}

.project-copy {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.project-copy strong,
.project-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-copy strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 760;
}

.project-copy small,
.project-meta,
.member-list small {
  color: var(--text-muted);
  font-size: 12px;
}

.project-detail,
.project-empty {
  min-height: 420px;
  padding: 22px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.project-detail-top {
  display: block;
}

.project-kicker {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 760;
}

.project-detail h2 {
  margin-top: 8px;
  font-size: 22px;
}

.project-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 24px 0;
}

.project-stats div {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: var(--surface-soft);
}

.project-stats strong {
  color: var(--text-strong);
  font-size: 20px;
}

.project-stats span {
  color: var(--text-muted);
  font-size: 12px;
}

.project-side-section {
  margin-top: 22px;
}

.project-side-section h3 {
  margin: 0 0 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.member-list,
.skill-list {
  display: grid;
  gap: 8px;
}

.member-list span,
.skill-list span {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--surface-muted);
  font-size: 13px;
}

.project-actions {
  justify-content: flex-start;
  margin-top: 26px;
}

.project-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
}

.project-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.34);
}

.project-modal {
  width: min(520px, calc(100vw - 36px));
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.project-modal h2 {
  font-size: 20px;
}

.project-modal label {
  display: grid;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.project-modal input,
.project-modal textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text-main);
  font: inherit;
}

.project-modal input {
  height: 38px;
  padding: 0 11px;
}

.project-modal textarea {
  resize: vertical;
  padding: 10px 11px;
}

@media (max-width: 980px) {
  .projects-page {
    padding: 28px 18px 40px;
  }

  .projects-header,
  .projects-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .project-search {
    width: 100%;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>
