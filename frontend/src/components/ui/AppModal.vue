<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import AppButton from './AppButton.vue';

const props = withDefaults(defineProps<{ open: boolean; title?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; closable?: boolean }>(), {
  size: 'md',
  closable: true,
});
const emit = defineEmits<{ 'update:open': [value: boolean]; close: [] }>();

const close = (): void => {
  if (!props.closable) return;
  emit('update:open', false);
  emit('close');
};

const onKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && props.open) close();
};

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="modal" @mousedown.self="close">
        <div class="modal__dialog" :class="`modal__dialog--${size}`" role="dialog" aria-modal="true">
          <header class="modal__header">
            <h2 class="modal__title"><slot name="title">{{ title }}</slot></h2>
            <AppButton v-if="closable" variant="ghost" size="sm" icon="x" icon-only @click="close" />
          </header>
          <div class="modal__body"><slot /></div>
          <footer v-if="$slots.footer" class="modal__footer"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px $space-4;
  overflow-y: auto;
  z-index: 1000;

  @include down($bp-sm) {
    padding: $space-4;
  }

  &__dialog {
    background: $color-surface;
    border-radius: $radius-lg;
    box-shadow: $shadow-lg;
    width: 100%;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 96px);

    &--sm {
      max-width: 420px;
    }

    &--md {
      max-width: 600px;
    }

    &--lg {
      max-width: 820px;
    }

    &--xl {
      max-width: 1080px;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    padding: $space-4 $space-5;
    border-bottom: 1px solid $color-border;
  }

  &__title {
    font-size: 17px;
  }

  &__body {
    padding: $space-5;
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
    padding: $space-3 $space-5;
    border-top: 1px solid $color-border;
    background: #fafbfd;
    border-radius: 0 0 $radius-lg $radius-lg;
  }
}
</style>
