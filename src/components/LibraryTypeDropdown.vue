<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Check, ChevronDown } from 'lucide-vue-next';

type TypeOption = {
  name: string;
  count: number;
};

const props = withDefaults(defineProps<{
  modelValue: string;
  options: TypeOption[];
  label?: string;
}>(), {
  label: '类型',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() =>
  props.options.find((option) => option.name === props.modelValue) ?? props.options[0] ?? null
);

const toggleOpen = () => {
  if (!props.options.length) return;
  isOpen.value = !isOpen.value;
};

const closeMenu = () => {
  isOpen.value = false;
};

const selectOption = (option: TypeOption) => {
  emit('update:modelValue', option.name);
  closeMenu();
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target;
  if (target instanceof Node && rootRef.value?.contains(target)) return;
  closeMenu();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu();
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div ref="rootRef" class="library-type-dropdown" @click.stop>
    <button
      class="type-filter-trigger"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggleOpen"
    >
      <span class="type-filter-label">{{ label }}</span>
      <strong>{{ selectedOption ? `${selectedOption.name}（${selectedOption.count}）` : '全部（0）' }}</strong>
      <ChevronDown :size="15" :stroke-width="2.4" class="type-filter-chevron" />
    </button>

    <div v-if="isOpen" class="type-filter-menu" role="listbox" :aria-label="label">
      <button
        v-for="option in options"
        :key="option.name"
        class="type-filter-option"
        :class="{ selected: modelValue === option.name }"
        type="button"
        role="option"
        :aria-selected="modelValue === option.name"
        @click="selectOption(option)"
      >
        <span>{{ option.name }}</span>
        <strong>{{ option.count }}</strong>
        <Check v-if="modelValue === option.name" :size="15" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.library-type-dropdown {
  position: relative;
  flex-shrink: 0;
}

.type-filter-trigger {
  min-width: 140px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--text-strong) 4%, transparent);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.type-filter-trigger:hover,
.type-filter-trigger[aria-expanded="true"] {
  border-color: var(--primary-border);
  background: var(--card-bg);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.type-filter-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
}

.type-filter-trigger strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.type-filter-chevron {
  margin-left: auto;
  color: var(--text-secondary);
  transition: transform 0.16s ease;
}

.type-filter-trigger[aria-expanded="true"] .type-filter-chevron {
  transform: rotate(180deg);
}

.type-filter-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 80;
  width: min(260px, calc(100vw - 32px));
  max-height: 320px;
  overflow-y: auto;
  padding: 7px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.type-filter-option {
  width: 100%;
  min-height: 36px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  text-align: left;
}

.type-filter-option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-filter-option strong {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
}

.type-filter-option svg {
  color: var(--primary-color);
}

.type-filter-option:hover,
.type-filter-option.selected {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.type-filter-option.selected strong {
  color: var(--primary-color);
}

@media (max-width: 600px) {
  .library-type-dropdown,
  .type-filter-trigger {
    width: 100%;
  }
}
</style>
