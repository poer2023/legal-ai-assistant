<script setup lang="ts">
import ChatInput from './ChatInput.vue';
import QuickActions from './QuickActions.vue';
</script>

<template>
  <div class="home-view">
    <div class="content-wrapper centered-layout">
      <!-- Big Center Title -->
      <div class="center-title-area">
        <h1 class="main-title">
          涌见 AI <span class="highlight">法律版</span>
        </h1>
      </div>

      <!-- Chat Input Area -->
      <div class="chat-area">
        <ChatInput />
      </div>

      <!-- Quick Actions Area -->
      <div class="quick-actions-area">
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
  padding-bottom: 80px;
}

.content-wrapper {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px;
}

.centered-layout {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.center-title-area {
  text-align: center;
  margin-bottom: 10px;
}

.main-title {
  font-size: 28px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: 0.5px;
}

.highlight {
  color: #3b82f6;
  font-weight: 700;
}

.chat-area {
  width: 100%;
}

.quick-actions-area {
  width: 100%;
}
</style>
