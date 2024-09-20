<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import AppButton from './AppButton.vue';

const props = withDefaults(defineProps<{ open: boolean; title?: string; width?: number }>(), { width: 480 });
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const close = (): void => emit('update:open', false);
const onKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && props.open) close();
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="drawer" @mousedown.self="close">
        <Transition name="slide" appear>
          <aside class="drawer__panel" :style="{ maxWidth: `${width}px` }">
            <header class="drawer__header">
              <h2 class="drawer__title">{{ title }}</h2>
              <AppButton variant="ghost" size="sm" icon="x" icon-only @click="close" />
            </header>
            <div class="drawer__body"><slot /></div>
            <footer v-if="$slots.footer" class="drawer__footer"><slot name="footer" /></footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;

  &__panel {
    width: 100%;
    height: 100%;
    background: $color-surface;
    box-shadow: $shadow-lg;
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-4 $space-5;
    border-bottom: 1px solid $color-border;
  }

  &__title {
    font-size: 17px;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: $space-5;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
    padding: $space-3 $space-5;
    border-top: 1px solid $color-border;
  }
}
</style>
