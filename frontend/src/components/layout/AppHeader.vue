<script setup lang="ts">
import { AppButton } from '@/components/ui';
import { useUiStore } from '@/stores/ui.store';
import LanguageSwitcher from './LanguageSwitcher.vue';
import NotificationsBell from './NotificationsBell.vue';
import UserMenu from './UserMenu.vue';

const ui = useUiStore();
</script>

<template>
  <header class="header">
    <div class="header__left">
      <AppButton variant="ghost" icon="menu" icon-only class="header__menu" @click="ui.toggleMobileSidebar()" />
      <slot name="left" />
    </div>
    <div class="header__right">
      <LanguageSwitcher />
      <NotificationsBell />
      <UserMenu />
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  position: sticky;
  top: 0;
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: 0 $space-6;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid $color-border;
  z-index: 800;

  @include down($bp-md) {
    padding: 0 $space-4;
  }

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  &__menu {
    display: none;

    @include down($bp-lg) {
      display: inline-flex;
    }
  }
}
</style>
