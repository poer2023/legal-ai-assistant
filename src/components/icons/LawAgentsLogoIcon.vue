<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ size?: number; radius?: number }>(), {
  size: 36,
  radius: 9,
});

const iconStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: `${props.radius}px`,
}));

const markSize = computed(() => Math.round(props.size * 0.78));
</script>

<template>
  <span class="lawagents-logo-icon" :style="iconStyle" aria-hidden="true">
    <span class="lawagents-logo-glow"></span>
    <svg
      class="lawagents-logo-mark"
      :width="markSize"
      :height="markSize"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="#F6EFE0">
        <circle cx="8" cy="32" r=".5" opacity=".22" />
        <circle cx="12.5" cy="33" r=".55" opacity=".24" />
        <circle cx="18" cy="33.4" r=".6" opacity=".28" />
        <circle cx="23.5" cy="33" r=".55" opacity=".24" />
        <circle cx="28" cy="32" r=".5" opacity=".22" />
        <circle cx="10.5" cy="30" r=".55" opacity=".4" />
        <circle cx="14.5" cy="30.6" r=".6" opacity=".48" />
        <circle cx="18" cy="30.2" r=".7" opacity=".58" />
        <circle cx="21.5" cy="30.6" r=".6" opacity=".48" />
        <circle cx="25.5" cy="30" r=".55" opacity=".4" />
        <circle cx="13" cy="28" r=".55" opacity=".55" />
        <circle cx="16" cy="27.7" r=".7" opacity=".75" />
        <circle cx="20" cy="27.7" r=".7" opacity=".75" />
        <circle cx="23" cy="28" r=".55" opacity=".55" />
        <circle cx="15.5" cy="25.5" r=".75" opacity=".85" />
        <circle cx="18" cy="25.2" r=".9" opacity="1" />
        <circle cx="20.5" cy="25.5" r=".75" opacity=".85" />
      </g>
      <path d="M 18 23 L 18 17.5" stroke="#F6EFE0" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="18" cy="15.8" r="4.6" fill="#E7895F" opacity="0.10" />
      <circle cx="18" cy="15.8" r="2.8" fill="#E7895F" opacity="0.22" />
      <circle cx="18" cy="15.8" r="1.85" fill="#E7895F" />
      <path d="M 18 15.3 L 9.5 6.5" stroke="#F6EFE0" stroke-width="2.1" stroke-linecap="round" />
      <path d="M 18 15.3 L 26.5 6.5" stroke="#F6EFE0" stroke-width="2.1" stroke-linecap="round" />
      <g fill="#F6EFE0">
        <circle cx="13" cy="3" r=".5" opacity=".32" />
        <circle cx="23" cy="2.6" r=".55" opacity=".38" />
        <circle cx="18" cy="1.4" r=".5" opacity=".28" />
        <circle cx="8" cy="4" r=".4" opacity=".22" />
        <circle cx="28" cy="4.2" r=".4" opacity=".22" />
      </g>
    </svg>
  </span>
</template>

<style scoped>
.lawagents-logo-icon {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(160deg, #2B2522 0%, #14110F 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08) inset,
    0 0 0 0.5px rgba(0, 0, 0, 0.4),
    0 2px 6px rgba(20, 17, 15, 0.18);
}

.lawagents-logo-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 55%, rgba(231, 137, 95, 0.16), transparent 55%);
}

.lawagents-logo-mark {
  position: relative;
  z-index: 1;
  display: block;
  flex-shrink: 0;
}
</style>
