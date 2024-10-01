<script setup lang="ts">
import { AppButton } from '@/components/ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="error-page">
    <p class="error-page__code">404</p>
    <h1>{{ t('errors.notFoundTitle') }}</h1>
    <p class="text-muted">{{ t('errors.notFoundText') }}</p>
    <RouterLink to="/home"><AppButton>{{ t('errors.goHome') }}</AppButton></RouterLink>
  </div>
</template>

<style scoped lang="scss">
.error-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  text-align: center;
  padding: $space-6;

  &__code {
    font-size: 72px;
    font-weight: 700;
    color: $color-primary-soft;
    line-height: 1;
  }
}
</style>
