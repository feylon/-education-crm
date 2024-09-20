<script setup lang="ts">
import { computed } from 'vue';
import { ICONS } from './icons';

const props = withDefaults(defineProps<{ name: string; size?: number | string }>(), { size: 20 });
const path = computed(() => ICONS[props.name] ?? ICONS.info);
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="app-icon">
    <path :d="path" />
  </svg>
</template>

<style scoped lang="scss">
.app-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
