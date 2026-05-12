<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import { useChatHistory } from './stores/chatHistory'
import { loadCustomSkills } from './data/skillCatalog'

const route = useRoute()
const isFullScreen = computed(() => route.meta.fullScreen === true)
const { loadHistory } = useChatHistory()

onMounted(() => {
  void loadHistory()
  void loadCustomSkills()
})
</script>

<template>
  <div class="app-container">
    <Sidebar v-if="!isFullScreen" />
    <main class="main-content" :class="{ 'full-screen': isFullScreen }">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-color);
}

.main-content {
  flex: 1;
  height: 100%;
  overflow-y: auto;
}

.main-content.full-screen {
  width: 100%;
}
</style>
