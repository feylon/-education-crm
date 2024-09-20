<script setup lang="ts">
import AppBreadcrumbs from '@/components/layout/AppBreadcrumbs.vue';

defineProps<{ title: string; subtitle?: string; hideBreadcrumbs?: boolean }>();
</script>

<template>
  <header class="page-header">
    <div class="page-header__text">
      <AppBreadcrumbs v-if="!hideBreadcrumbs" />
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: $space-4;
  flex-wrap: wrap;

  &__text {
    min-width: 0;
  }

  &__title {
    margin-top: 4px;
  }

  &__subtitle {
    color: $color-text-muted;
    margin-top: 4px;
  }

  &__actions {
    display: flex;
    gap: $space-2;
    flex-wrap: wrap;
  }
}
</style>
