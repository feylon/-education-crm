<script setup lang="ts">
import { AppIcon } from '@/components/ui';
import { MENU, type MenuItem } from '@/router/menu';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const ui = useUiStore();
const auth = useAuthStore();
const { t } = useI18n();

const visible = (item: MenuItem): boolean => {
  if (item.roles && !auth.hasRole(...item.roles)) return false;
  if (item.staffOnly && !auth.isStaff) return false;
  if (item.permissions && !auth.hasPermission(...item.permissions)) return false;
  return true;
};

const sections = computed(() => MENU.map((section) => ({ ...section, items: section.items.filter(visible) })).filter((section) => section.items.length > 0));
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': ui.sidebarCollapsed, 'sidebar--mobile-open': ui.mobileSidebarOpen }">
    <div class="sidebar__brand">
      <span class="sidebar__logo">E</span>
      <span class="sidebar__name">{{ t('app.name') }}</span>
    </div>
    <nav class="sidebar__nav">
      <div v-for="(section, index) in sections" :key="index" class="sidebar__section">
        <p v-if="section.labelKey" class="sidebar__section-label">{{ t(section.labelKey) }}</p>
        <RouterLink
          v-for="item in section.items"
          :key="item.key"
          :to="item.to"
          class="sidebar__link"
          active-class="sidebar__link--active"
          :title="ui.sidebarCollapsed ? t(item.labelKey) : undefined"
          @click="ui.toggleMobileSidebar(false)"
        >
          <AppIcon :name="item.icon" :size="20" />
          <span class="sidebar__label">{{ t(item.labelKey) }}</span>
        </RouterLink>
      </div>
    </nav>
    <button type="button" class="sidebar__collapse" :title="ui.sidebarCollapsed ? t('nav.expand') : t('nav.collapse')" @click="ui.toggleSidebar()">
      <AppIcon :name="ui.sidebarCollapsed ? 'chevronRight' : 'chevronLeft'" :size="18" />
      <span class="sidebar__label">{{ t('nav.collapse') }}</span>
    </button>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: $sidebar-width;
  background: $color-sidebar;
  color: $color-sidebar-text;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease, transform 0.2s ease;
  z-index: 900;

  &--collapsed {
    width: $sidebar-collapsed;

    .sidebar__label,
    .sidebar__name,
    .sidebar__section-label {
      display: none;
    }

    .sidebar__link,
    .sidebar__collapse {
      justify-content: center;
    }
  }

  @include down($bp-lg) {
    transform: translateX(-100%);
    width: $sidebar-width;

    &--mobile-open {
      transform: translateX(0);
      box-shadow: $shadow-lg;
    }

    &--collapsed .sidebar__label,
    &--collapsed .sidebar__name,
    &--collapsed .sidebar__section-label {
      display: inline;
    }

    &--collapsed .sidebar__link {
      justify-content: flex-start;
    }
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: $space-3;
    height: $header-height;
    padding: 0 $space-5;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #fff;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
  }

  &__logo {
    width: 32px;
    height: 32px;
    border-radius: $radius-md;
    background: $color-primary;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  &__nav {
    flex: 1;
    overflow-y: auto;
    padding: $space-3 $space-3;
  }

  &__section {
    margin-bottom: $space-3;
  }

  &__section-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    padding: $space-3 $space-3 $space-2;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: 10px $space-3;
    border-radius: $radius-md;
    color: $color-sidebar-text;
    font-weight: 500;
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      background: $color-sidebar-active;
      color: #fff;
      text-decoration: none;
    }

    &--active {
      background: $color-primary;
      color: #fff;
    }
  }

  &__collapse {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin: $space-3;
    padding: 10px $space-3;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    font-size: 13px;

    &:hover {
      background: $color-sidebar-active;
      color: #fff;
    }

    @include down($bp-lg) {
      display: none;
    }
  }
}
</style>
