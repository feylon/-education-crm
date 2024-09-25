<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const route = useRoute();
const { t } = useI18n();

const crumbs = computed(() => {
  const items: Array<{ label: string; to?: string }> = [{ label: t('nav.dashboard'), to: '/home' }];
  for (const crumb of route.meta.breadcrumbs ?? []) {
    items.push({ label: t(crumb.titleKey), to: crumb.to });
  }
  if (route.meta.titleKey && route.path !== '/home' && route.path !== '/dashboard') {
    items.push({ label: t(route.meta.titleKey) });
  }
  return items;
});
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <template v-for="(crumb, index) in crumbs" :key="index">
      <RouterLink v-if="crumb.to && index < crumbs.length - 1" :to="crumb.to" class="breadcrumbs__link">{{ crumb.label }}</RouterLink>
      <span v-else class="breadcrumbs__current">{{ crumb.label }}</span>
      <span v-if="index < crumbs.length - 1" class="breadcrumbs__sep">/</span>
    </template>
  </nav>
</template>

<style scoped lang="scss">
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $color-text-soft;
  flex-wrap: wrap;

  &__link {
    color: $color-text-muted;

    &:hover {
      color: $color-primary;
      text-decoration: none;
    }
  }

  &__current {
    color: $color-text-soft;
  }
}
</style>
