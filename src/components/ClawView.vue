<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatHistory } from '../stores/chatHistory';
import { getActiveWorkspaceId } from '../stores/workspaces';

const router = useRouter();
const { upsertSpecialConversation } = useChatHistory();

onMounted(() => {
  const item = upsertSpecialConversation(
    'claw',
    'claw 会话',
    'claw',
    {
      content: [
        '已进入 claw 会话。',
        '',
        '把你要处理的材料、目标或问题发给我，我会在这个特殊会话里继续。',
      ].join('\n'),
      model: 'claw',
      cachedAt: new Date().toISOString(),
    },
  );

  void router.replace({
    name: 'chat',
    query: {
      historyId: item?.id ?? 'special-claw',
      workspaceId: item?.workspaceId ?? getActiveWorkspaceId(),
      source: 'claw',
    },
  });
});
</script>

<template>
  <section class="claw-redirect" aria-label="正在打开 claw 会话"></section>
</template>

<style scoped>
.claw-redirect {
  min-height: 100%;
  background: var(--bg-color);
}
</style>
