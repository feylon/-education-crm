<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(defineProps<{ label: string; value: string | number; hint?: string; icon?: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' }>(), {
  tone: 'primary',
});
</script>

<template>
  <div class="stat">
    <div class="stat__icon" :class="`stat__icon--${tone}`">
      <AppIcon :name="icon ?? 'info'" :size="22" />
    </div>
    <div class="stat__content">
      <p class="stat__label">{{ label }}</p>
      <p class="stat__value">{{ value }}</p>
      <p v-if="hint" class="stat__hint">{{ hint }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stat {
  display: flex;
  gap: $space-4;
  align-items: flex-start;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $space-5;
  box-shadow: $shadow-sm;
  min-width: 0;

  &__icon {
    width: 44px;
    height: 44px;
    border-radius: $radius-md;
    display: grid;
    place-items: center;
    flex-shrink: 0;

    &--primary {
      background: $color-primary-soft;
      color: $color-primary;
    }

    &--success {
      background: $color-success-soft;
      color: $color-success;
    }

    &--warning {
      background: $color-warning-soft;
      color: $color-warning;
    }

    &--danger {
      background: $color-danger-soft;
      color: $color-danger;
    }

    &--info {
      background: $color-info-soft;
      color: $color-info;
    }

    &--purple {
      background: $color-purple-soft;
      color: $color-purple;
    }
  }

  &__content {
    min-width: 0;
  }

  &__label {
    font-size: 13px;
    color: $color-text-muted;
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
    @include truncate;
  }

  &__hint {
    font-size: 12px;
    color: $color-text-soft;
    margin-top: 2px;
  }
}
</style>
