<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import AppIcon from './AppIcon.vue';

const { toasts, dismiss } = useToast();
const icons: Record<string, string> = { success: 'check', error: 'warning', info: 'info', warning: 'warning' };
</script>

<template>
  <Teleport to="body">
    <div class="toaster">
      <TransitionGroup name="slide">
        <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast--${toast.kind}`" role="status">
          <AppIcon :name="icons[toast.kind]" :size="18" class="toast__icon" />
          <div class="toast__content">
            <p class="toast__title">{{ toast.title }}</p>
            <p v-if="toast.message" class="toast__message">{{ toast.message }}</p>
          </div>
          <button type="button" class="toast__close" @click="dismiss(toast.id)"><AppIcon name="x" :size="16" /></button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.toaster {
  position: fixed;
  top: $space-4;
  right: $space-4;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  z-index: 2000;
  width: min(380px, calc(100vw - 32px));
}

.toast {
  display: flex;
  gap: $space-3;
  align-items: flex-start;
  padding: $space-3 $space-4;
  background: $color-surface;
  border: 1px solid $color-border;
  border-left-width: 4px;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;

  &--success {
    border-left-color: $color-success;

    .toast__icon {
      color: $color-success;
    }
  }

  &--error {
    border-left-color: $color-danger;

    .toast__icon {
      color: $color-danger;
    }
  }

  &--info {
    border-left-color: $color-info;

    .toast__icon {
      color: $color-info;
    }
  }

  &--warning {
    border-left-color: $color-warning;

    .toast__icon {
      color: $color-warning;
    }
  }

  &__icon {
    margin-top: 2px;
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-weight: 600;
    font-size: 14px;
  }

  &__message {
    font-size: 13px;
    color: $color-text-muted;
    margin-top: 2px;
    word-break: break-word;
  }

  &__close {
    border: none;
    background: transparent;
    color: $color-text-soft;
    cursor: pointer;
    padding: 2px;

    &:hover {
      color: $color-text;
    }
  }
}
</style>
