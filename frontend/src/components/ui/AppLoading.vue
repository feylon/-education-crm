<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(defineProps<{ text?: string; inline?: boolean }>(), { inline: false });
const { t } = useI18n();
</script>

<template>
  <div class="loading" :class="{ 'loading--inline': inline }">
    <span class="loading__spinner" />
    <span class="loading__text">{{ text ?? t('common.loading') }}</span>
  </div>
</template>

<style scoped lang="scss">
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  padding: $space-10;
  color: $color-text-muted;

  &--inline {
    padding: $space-3;
  }

  &__spinner {
    width: 22px;
    height: 22px;
    border: 3px solid $color-primary-soft;
    border-top-color: $color-primary;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
