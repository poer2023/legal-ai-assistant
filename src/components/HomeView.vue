<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChatInput from './ChatInput.vue';
import type { ComposerSubmitOptions } from './ChatInput.vue';
import { useOrgSession } from '../stores/orgSession';
import { getActiveWorkspaceId } from '../stores/workspaces';

type ComposerAction = 'skill' | 'template' | 'use-skill';
type ChatInputController = InstanceType<typeof ChatInput> & {
  createSkillFromModal: (skillName?: string) => void;
  createTemplateFromDropdown: () => void;
};

const inputValue = ref('');
const chatInputRef = ref<ChatInputController | null>(null);
const route = useRoute();
const router = useRouter();
const { currentOrganization, currentUser } = useOrgSession();
const handledComposerAction = ref('');
const lawAgentsFirmTitle = computed(() =>
  currentOrganization.value?.name?.trim()
  || currentUser.value?.firmShortName?.trim()
  || '演示团队'
);
const lawAgentsTeamTitle = computed(() => {
  const shortName = currentOrganization.value?.shortName?.trim() || '';
  return shortName && shortName !== lawAgentsFirmTitle.value ? shortName : '';
});

const getComposerAction = (): ComposerAction | null => {
  const action = route.query.composerAction;
  return action === 'skill' || action === 'template' || action === 'use-skill' ? action : null;
};

const clearComposerActionQuery = () => {
  const nextQuery = { ...route.query };
  delete nextQuery.composerAction;
  delete nextQuery.composerSource;
  delete nextQuery.composerTick;
  delete nextQuery.skillName;
  void router.replace({ name: 'home', query: nextQuery });
};

const handleComposerSubmit = (value: string, options?: ComposerSubmitOptions) => {
  if (!value.trim()) return;
  const workspaceId = options?.workspaceId || getActiveWorkspaceId();

  void router.push({
    name: 'chat',
    query: {
      prompt: value.trim(),
      workspaceId,
    },
  });
};

const triggerComposerAction = async () => {
  const action = getComposerAction();
  if (!action) return;

  const actionKey = `${action}:${String(route.query.composerTick ?? '')}`;
  if (handledComposerAction.value === actionKey) return;
  handledComposerAction.value = actionKey;

  await nextTick();
  const composer = chatInputRef.value;
  if (!composer) {
    handledComposerAction.value = '';
    return;
  }

  if (action === 'skill') {
    composer.createSkillFromModal();
  } else if (action === 'use-skill') {
    const skillName = typeof route.query.skillName === 'string' ? route.query.skillName : '';
    if (skillName) {
      composer.createSkillFromModal(skillName);
    }
  } else {
    composer.createTemplateFromDropdown();
  }

  clearComposerActionQuery();
};

onMounted(() => {
  void triggerComposerAction();
});

watch(
  () => [route.query.composerAction, route.query.composerTick],
  () => {
    void triggerComposerAction();
  },
);
</script>

<template>
  <div class="home-view">
    <div class="content-wrapper">
      <div class="center-title-area">
        <h1 class="main-title">
          <span>{{ lawAgentsFirmTitle }}</span>
          <span v-if="lawAgentsTeamTitle" class="lawagents-title-dot" aria-hidden="true">·</span>
          <span v-if="lawAgentsTeamTitle">{{ lawAgentsTeamTitle }}</span>
          <span class="title-divider" aria-hidden="true">|</span>
          <span class="assistant-title">AI 法律工作台</span>
        </h1>
      </div>

      <div class="chat-area">
        <ChatInput
          ref="chatInputRef"
          v-model="inputValue"
          @submit="handleComposerSubmit"
        />
      </div>

    </div>
  </div>
</template>

<style scoped>
.home-view {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: clamp(72px, calc(34vh - 112px), 188px) 40px 40px;
  background: var(--bg-color);
  transition: padding-top 0.24s ease;
}

.content-wrapper {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
}

.center-title-area {
  text-align: center;
  margin-bottom: 52px;
  transition: margin-bottom 0.24s ease, transform 0.24s ease;
}

.main-title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: 0;
  margin: 0;
  line-height: 1.25;
}

.title-divider {
  width: 1px;
  height: 30px;
  background: var(--border-color);
}

.assistant-title {
  color: var(--text-strong);
}

.chat-area {
  width: 100%;
  margin: 0 auto 26px;
  position: relative;
  transition: transform 0.24s ease;
}

@media (max-width: 768px) {
  .home-view {
    padding: 24px 16px 32px;
    justify-content: flex-start;
  }

  .main-title {
    flex-wrap: wrap;
    row-gap: 8px;
    font-size: 26px;
  }

  .title-divider {
    display: none;
  }

  .chat-area {
    margin-bottom: 28px;
  }

}
</style>
