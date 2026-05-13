<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChatInput from './ChatInput.vue';

type ComposerAction = 'skill' | 'template' | 'use-skill';
type ChatInputController = InstanceType<typeof ChatInput> & {
  createSkillFromModal: (skillName?: string) => void;
  createTemplateFromDropdown: () => void;
};

const inputValue = ref('');
const chatInputRef = ref<ChatInputController | null>(null);
const route = useRoute();
const router = useRouter();
const handledComposerAction = ref('');
const isSkillCreatorGuideActive = ref(false);

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

const handleComposerSubmit = (value: string) => {
  if (!value.trim()) return;

  void router.push({
    name: 'chat',
    query: {
      prompt: value.trim(),
    },
  });
};

const handleSkillCreatorGuideActiveChange = (active: boolean) => {
  isSkillCreatorGuideActive.value = active;
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
  <div class="home-view" :class="{ 'skill-guide-mode': isSkillCreatorGuideActive }">
    <div class="content-wrapper">
      <div class="center-title-area">
        <h1 class="main-title">
          <span>演示团队</span>
          <span class="title-divider" aria-hidden="true"></span>
          <span class="assistant-title">AI法律助手</span>
        </h1>
      </div>

      <div class="chat-area">
        <ChatInput
          ref="chatInputRef"
          v-model="inputValue"
          @submit="handleComposerSubmit"
          @skill-guide-active-change="handleSkillCreatorGuideActiveChange"
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
  padding: clamp(96px, calc(38.2vh - 132px), 240px) 40px 40px;
  background: var(--bg-color);
  transition: padding-top 0.24s ease;
}

.home-view.skill-guide-mode {
  padding-top: clamp(52px, calc(16vh - 58px), 84px);
}

.content-wrapper {
  width: 100%;
  max-width: 850px;
  margin: 0 auto;
}

.center-title-area {
  text-align: center;
  margin-bottom: 70px;
  transition: margin-bottom 0.24s ease, transform 0.24s ease;
}

.home-view.skill-guide-mode .center-title-area {
  margin-bottom: 174px;
  transform: none;
}

.main-title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  font-size: 30px;
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
  color: var(--primary-color);
}

.chat-area {
  width: 100%;
  margin: 0 auto 26px;
  position: relative;
  transition: transform 0.24s ease;
}

.home-view.skill-guide-mode .chat-area {
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .home-view {
    padding: 24px 16px 32px;
    justify-content: flex-start;
  }

  .home-view.skill-guide-mode {
    padding-top: 18px;
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

  .home-view.skill-guide-mode .center-title-area {
    margin-bottom: 48px;
    transform: translateY(-8px);
  }

  .home-view.skill-guide-mode .chat-area {
    transform: translateY(0);
  }
}
</style>
