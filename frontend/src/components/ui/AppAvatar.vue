<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ src?: string | null; name?: string; size?: number }>(), { size: 36 });
const initials = computed(() =>
  (props.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
);
const hue = computed(() => {
  let hash = 0;
  for (const char of props.name ?? '') hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
});
</script>

<template>
  <span class="avatar" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px`, background: src ? 'transparent' : `hsl(${hue} 60% 45%)` }">
    <img v-if="src" :src="src" :alt="name" class="avatar__img" />
    <template v-else>{{ initials || '?' }}</template>
  </span>
</template>

<style scoped lang="scss">
.avatar {
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
