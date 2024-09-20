<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    icon?: string;
    iconOnly?: boolean;
    title?: string;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false, iconOnly: false },
);
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'btn--loading': loading, 'btn--icon-only': iconOnly }]"
    :disabled="disabled || loading"
    :title="title"
  >
    <span v-if="loading" class="btn__spinner" />
    <AppIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" />
    <span v-if="!iconOnly" class="btn__label"><slot /></span>
  </button>
</template>

<style scoped lang="scss">
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  border: 1px solid transparent;
  border-radius: $radius-md;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  white-space: nowrap;
  line-height: 1;

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &--sm {
    padding: 6px 10px;
    font-size: 13px;
    height: 32px;
  }

  &--md {
    padding: 9px 14px;
    font-size: 14px;
    height: 38px;
  }

  &--lg {
    padding: 11px 18px;
    font-size: 15px;
    height: 44px;
  }

  &--icon-only {
    padding-left: 0;
    padding-right: 0;
    aspect-ratio: 1;
  }

  &--block {
    width: 100%;
  }

  &--primary {
    background: $color-primary;
    color: #fff;

    &:hover:not(:disabled) {
      background: $color-primary-hover;
    }
  }

  &--secondary {
    background: $color-primary-soft;
    color: $color-primary-hover;

    &:hover:not(:disabled) {
      background: darken($color-primary-soft, 4%);
    }
  }

  &--outline {
    background: $color-surface;
    border-color: $color-border-strong;
    color: $color-text;

    &:hover:not(:disabled) {
      background: $color-bg;
    }
  }

  &--ghost {
    background: transparent;
    color: $color-text-muted;

    &:hover:not(:disabled) {
      background: $color-bg;
      color: $color-text;
    }
  }

  &--danger {
    background: $color-danger;
    color: #fff;

    &:hover:not(:disabled) {
      background: darken($color-danger, 6%);
    }
  }

  &--success {
    background: $color-success;
    color: #fff;

    &:hover:not(:disabled) {
      background: darken($color-success, 5%);
    }
  }

  &__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
