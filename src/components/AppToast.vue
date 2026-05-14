<script setup lang="ts">
import { computed } from 'vue';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-vue-next';
import { useToast, type ToastTone } from '../stores/toast';

const { toastMessage, toastTone } = useToast();

const toastIcons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
} satisfies Record<ToastTone, typeof CheckCircle2>;

const toastIcon = computed(() => toastIcons[toastTone.value]);
</script>

<template>
  <Teleport to="body">
    <Transition name="app-toast">
      <div
        v-if="toastMessage"
        class="app-toast"
        :class="`is-${toastTone}`"
        role="status"
        aria-live="polite"
      >
        <component :is="toastIcon" :size="16" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-toast {
  position: fixed;
  left: 50%;
  top: 18px;
  z-index: 2200;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100vw - 32px));
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--diff-added-border);
  border-radius: 10px;
  color: var(--diff-added);
  background: color-mix(in srgb, var(--diff-added-soft) 88%, var(--card-bg));
  box-shadow: 0 12px 30px rgba(22, 163, 74, 0.14);
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
  font-size: 14px;
  font-weight: 650;
}

.app-toast svg {
  flex-shrink: 0;
}

.app-toast.is-info {
  border-color: var(--primary-border);
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-soft) 88%, var(--card-bg));
  box-shadow: 0 12px 30px color-mix(in srgb, var(--primary-color) 14%, transparent);
}

.app-toast.is-warning {
  border-color: var(--warning-border);
  color: var(--warning-color);
  background: color-mix(in srgb, var(--warning-soft) 88%, var(--card-bg));
  box-shadow: 0 12px 30px rgba(217, 119, 6, 0.14);
}

.app-toast.is-error {
  border-color: var(--diff-removed-border);
  color: var(--diff-removed);
  background: color-mix(in srgb, var(--diff-removed-soft) 88%, var(--card-bg));
  box-shadow: 0 12px 30px rgba(220, 38, 38, 0.14);
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
