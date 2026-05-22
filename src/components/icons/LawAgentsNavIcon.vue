<script setup lang="ts">
withDefaults(defineProps<{
  kind:
    | 'assistant'
    | 'skills'
    | 'templates'
    | 'knowledge'
    | 'claw'
    | 'schedule'
    | 'search'
    | 'history'
    | 'profile'
    | 'settings'
    | 'attach'
    | 'mic'
    | 'send'
    | 'chevron-left'
    | 'chevron-right';
  size?: number;
}>(), {
  size: 18,
});
</script>

<template>
  <svg
    class="lawagents-nav-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="kind === 'assistant'">
      <path d="M4.5 5.5 a2 2 0 0 1 2-2 h11 a2 2 0 0 1 2 2 v8 a2 2 0 0 1-2 2 H10 l-4 3.5 v-3.5 H6.5 a2 2 0 0 1-2-2 z" />
      <path d="M12 7.5 l.7 1.7 1.8.3-1.4 1.2.4 1.8L12 11.7 l-1.5.8.4-1.8L9.5 9.5 l1.8-.3 z" fill="currentColor" stroke="none" />
    </template>
    <path
      v-else-if="kind === 'skills'"
      d="M14.5 3.5 a1.5 1.5 0 0 0-1.5 1.5 V7.5 H10.5 a2 2 0 0 0-2 2 v2.5 H6 a1.5 1.5 0 1 0 0 3 H8.5 v2.5 a2 2 0 0 0 2 2 H13 v-2.5 a1.5 1.5 0 1 1 3 0 V20 h2.5 a2 2 0 0 0 2-2 v-3.5 a1.5 1.5 0 1 1 0-3 V8 a2 2 0 0 0-2-2 H16 V5 a1.5 1.5 0 0 0-1.5-1.5 z"
    />
    <template v-else-if="kind === 'templates'">
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <rect x="7" y="6.5" width="10" height="3" rx="1" />
      <rect x="7" y="11.5" width="4.2" height="6" rx="1" />
      <rect x="12.8" y="11.5" width="4.2" height="2.5" rx="1" />
      <rect x="12.8" y="15" width="4.2" height="2.5" rx="1" />
    </template>
    <template v-else-if="kind === 'knowledge'">
      <path d="M4.5 4 h3.6 a1 1 0 0 1 1 1 v15 a1 1 0 0 1-1 1 H4.5 a1 1 0 0 1-1-1 V5 a1 1 0 0 1 1-1 z" />
      <path d="M10.2 4 h3.6 a1 1 0 0 1 1 1 v15 a1 1 0 0 1-1 1 h-3.6 a1 1 0 0 1-1-1 V5 a1 1 0 0 1 1-1 z" />
      <path d="m17 4.4 2.6.7 a1 1 0 0 1 .7 1.2 l-3.7 14.4 a1 1 0 0 1-1.2.7 l-2.6-.7" />
      <path d="M6.3 8 h0.01 M12 8 h0.01" stroke-width="1.8" />
    </template>
    <template v-else-if="kind === 'claw'">
      <path d="M6.5 4.5 h7 a4 4 0 0 1 4 4 v2.5" />
      <path d="M6.5 4.5 v5.8 a4.2 4.2 0 0 0 4.2 4.2 h2.2" />
      <path d="M6.5 9.5 H4.8 a2.3 2.3 0 0 0 0 4.6 h2.7" />
      <path d="M17.5 8.5 h1.2 a2.3 2.3 0 0 1 0 4.6 h-1.6" />
      <path d="M10 15.2 v1.9 a2.4 2.4 0 0 1-2.4 2.4 H6" />
      <path d="M14 15.2 v1.9 a2.4 2.4 0 0 0 2.4 2.4 H18" />
      <path d="M9.2 8.2 h0.01 M13.8 8.2 h0.01" stroke-width="2.2" />
    </template>
    <template v-else-if="kind === 'schedule'">
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3.5 v3 M16 3.5 v3 M4 9 h16" />
      <circle cx="12" cy="14.5" r="3.2" />
      <path d="M12 12.8 v1.8 l1.3.8" />
    </template>
    <template v-else-if="kind === 'search'">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </template>
    <template v-else-if="kind === 'history'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7 v5 l3 2" />
    </template>
    <template v-else-if="kind === 'profile'">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20 a7 7 0 0 1 14 0" />
    </template>
    <template v-else-if="kind === 'settings'">
      <path d="M4 7 h7 M15 7 h5" />
      <circle cx="13" cy="7" r="2" />
      <path d="M4 17 h5 M13 17 h7" />
      <circle cx="11" cy="17" r="2" />
    </template>
    <path
      v-else-if="kind === 'attach'"
      d="M20.5 11.5 12.7 19.3 a4.5 4.5 0 0 1-6.4-6.4 L14.5 4.7 a3 3 0 0 1 4.2 4.2 L10.6 17 a1.5 1.5 0 0 1-2.1-2.1 L15.8 7.6"
    />
    <template v-else-if="kind === 'mic'">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11 a7 7 0 0 0 14 0" />
      <path d="M12 18 v3" />
    </template>
    <path v-else-if="kind === 'send'" d="M5 12 19 5 12 19 11 13 z" />
    <path v-else-if="kind === 'chevron-left'" d="m14 6-6 6 6 6" />
    <path v-else-if="kind === 'chevron-right'" d="m10 6 6 6-6 6" />
  </svg>
</template>

<style scoped>
.lawagents-nav-icon {
  display: block;
  flex-shrink: 0;
}
</style>
