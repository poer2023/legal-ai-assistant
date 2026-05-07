<script setup lang="ts">
import { computed } from 'vue';
import knowledgeSearchIcon from '../../assets/knowledge-search-icon.png';

const props = withDefaults(defineProps<{ size?: number | string }>(), {
  size: 16,
});

const iconSize = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size
);

const maskStyle = computed(() => ({
  width: iconSize.value,
  height: iconSize.value,
  WebkitMaskImage: `url(${knowledgeSearchIcon})`,
  maskImage: `url(${knowledgeSearchIcon})`,
}));
</script>

<template>
  <span
    class="knowledge-search-icon"
    :style="maskStyle"
    aria-hidden="true"
  ></span>
</template>

<style scoped>
.knowledge-search-icon {
  display: inline-block;
  flex-shrink: 0;
  background-color: currentColor;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}
</style>
