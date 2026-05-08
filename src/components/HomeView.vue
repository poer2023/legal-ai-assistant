<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChatInput from './ChatInput.vue';
import QuickActions from './QuickActions.vue';

type ComposerAction = 'skill' | 'template';
type ChatInputController = InstanceType<typeof ChatInput> & {
  createSkillFromModal: (skillName?: string) => void;
  createTemplateFromDropdown: () => void;
};

const inputValue = ref('');
const chatInputRef = ref<ChatInputController | null>(null);
const route = useRoute();
const router = useRouter();
const handledComposerAction = ref('');

const getComposerAction = (): ComposerAction | null => {
  const action = route.query.composerAction;
  return action === 'skill' || action === 'template' ? action : null;
};

const clearComposerActionQuery = () => {
  const nextQuery = { ...route.query };
  delete nextQuery.composerAction;
  delete nextQuery.composerSource;
  delete nextQuery.composerTick;
  void router.replace({ name: 'home', query: nextQuery });
};

const handleComposerSubmit = (value: string) => {
  if (!value.trim()) return;

  void router.push({
    name: 'chat',
    query: {
      mock: 'docx',
      prompt: value.trim(),
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
          <span>演示团队</span>
          <span class="title-divider" aria-hidden="true"></span>
          <span class="assistant-title">AI法律助手</span>
        </h1>
      </div>

      <div class="chat-area">
        <ChatInput ref="chatInputRef" v-model="inputValue" @submit="handleComposerSubmit" />
      </div>

      <div class="apps-section">
        <QuickActions />
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
  justify-content: center;
  padding: 40px;
  background: #f8fafc;
}

.content-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.center-title-area {
  text-align: center;
  margin-bottom: 70px;
}

.main-title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  font-size: 30px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0;
  margin: 0;
  line-height: 1.25;
}

.title-divider {
  width: 1px;
  height: 30px;
  background: #cbd5e1;
}

.assistant-title {
  color: #2563eb;
}

.chat-area {
  width: 100%;
  margin: 0 auto 26px;
  position: relative;
}

.apps-section {
  margin-top: 0;
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
