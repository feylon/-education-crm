<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';

const ui = useUiStore();
</script>

<template>
  <div class="layout" :class="{ 'layout--collapsed': ui.sidebarCollapsed }">
    <AppSidebar />
    <div v-if="ui.mobileSidebarOpen" class="layout__backdrop" @click="ui.toggleMobileSidebar(false)" />
    <div class="layout__main">
      <AppHeader />
      <main class="layout__content">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout {
  min-height: 100vh;

  &__main {
    margin-left: $sidebar-width;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    transition: margin-left 0.2s ease;

    @include down($bp-lg) {
      margin-left: 0;
    }
  }

  &--collapsed .layout__main {
    margin-left: $sidebar-collapsed;

    @include down($bp-lg) {
      margin-left: 0;
    }
  }

  &__content {
    flex: 1;
    padding: $space-6;
    max-width: 1600px;
    width: 100%;

    @include down($bp-md) {
      padding: $space-4;
    }
  }

  &__backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    z-index: 850;
  }
}
</style>
