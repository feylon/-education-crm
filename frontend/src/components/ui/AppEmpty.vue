<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(defineProps<{ title: string; hint?: string; icon?: string }>(), { icon: 'search' });
</script>

<template>
  <div class="empty">
    <div class="empty__icon"><AppIcon :name="icon" :size="28" /></div>
    <p class="empty__title">{{ title }}</p>
    <p v-if="hint" class="empty__hint">{{ hint }}</p>
    <div v-if="$slots.default" class="empty__actions"><slot /></div>
  </div>
</template>

<style scoped lang="scss">
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: $space-10 $space-4;
  gap: $space-2;

  &__icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: $color-bg;
    color: $color-text-soft;
    display: grid;
    place-items: center;
    margin-bottom: $space-2;
  }

  &__title {
    font-weight: 600;
  }

  &__hint {
    color: $color-text-muted;
    font-size: 13px;
    max-width: 360px;
  }

  &__actions {
    margin-top: $space-3;
  }
}
</style>
