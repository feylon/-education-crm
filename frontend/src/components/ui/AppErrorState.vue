<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppButton from './AppButton.vue';
import AppIcon from './AppIcon.vue';

defineProps<{ message: string; title?: string }>();
const emit = defineEmits<{ retry: [] }>();
const { t } = useI18n();
</script>

<template>
  <div class="error-state">
    <div class="error-state__icon"><AppIcon name="warning" :size="26" /></div>
    <p class="error-state__title">{{ title ?? t('common.errorTitle') }}</p>
    <p class="error-state__message">{{ message }}</p>
    <AppButton variant="outline" size="sm" icon="refresh" @click="emit('retry')">{{ t('common.retry') }}</AppButton>
  </div>
</template>

<style scoped lang="scss">
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: $space-2;
  padding: $space-8 $space-4;

  &__icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: $color-danger-soft;
    color: $color-danger;
    display: grid;
    place-items: center;
  }

  &__title {
    font-weight: 600;
  }

  &__message {
    color: $color-text-muted;
    font-size: 13px;
    max-width: 420px;
    margin-bottom: $space-2;
  }
}
</style>
