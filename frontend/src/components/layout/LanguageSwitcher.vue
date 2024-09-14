<script setup lang="ts">
import { AppDropdown, AppIcon } from '@/components/ui';
import { SUPPORTED_LOCALES, useUiStore, type Locale } from '@/stores/ui.store';
import { useI18n } from 'vue-i18n';

const ui = useUiStore();
const { t, locale } = useI18n();

const choose = (value: Locale): void => {
  ui.setLocale(value);
  locale.value = value;
};
</script>

<template>
  <AppDropdown :width="160">
    <template #trigger>
      <button type="button" class="lang-trigger" :title="t('profile.language')">
        <AppIcon name="globe" :size="18" />
        <span class="lang-trigger__code">{{ ui.locale.toUpperCase() }}</span>
      </button>
    </template>
    <button v-for="code in SUPPORTED_LOCALES" :key="code" type="button" class="dropdown-item" :class="{ 'dropdown-item--active': code === ui.locale }" @click="choose(code)">
      {{ t(`language.${code}`) }}
    </button>
  </AppDropdown>
</template>

<style scoped lang="scss">
.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  color: $color-text-muted;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    color: $color-text;
    background: $color-bg;
  }

  &__code {
    font-size: 12px;
  }
}
</style>
