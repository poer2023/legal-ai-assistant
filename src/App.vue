<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import AppToast from './components/AppToast.vue'
import { syncHistoryForCurrentOrganization, useChatHistory } from './stores/chatHistory'
import { loadCustomSkills, syncSkillCatalogForCurrentOrganization } from './data/skillCatalog'
import { loadCustomTemplates, syncTemplateCatalogForCurrentOrganization } from './data/templateCatalog'
import { useOrgSession } from './stores/orgSession'

const route = useRoute()
const isFullScreen = computed(() => route.meta.fullScreen === true)
const { loadHistory } = useChatHistory()
const { currentOrganizationId, hasActiveOrganization } = useOrgSession()

watch(currentOrganizationId, () => {
  if (!hasActiveOrganization.value) return

  syncHistoryForCurrentOrganization()
  syncSkillCatalogForCurrentOrganization()
  syncTemplateCatalogForCurrentOrganization()
  void loadHistory()
  void loadCustomSkills()
  void loadCustomTemplates()
}, {
  immediate: true,
})
</script>

<template>
  <div class="app-container">
    <Sidebar v-if="!isFullScreen" />
    <main class="main-content" :class="{ 'full-screen': isFullScreen }">
      <router-view />
    </main>
    <AppToast />
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
  min-width: 0;
  height: 100%;
  overflow-y: auto;
}

.main-content.full-screen {
  width: 100%;
}
</style>
