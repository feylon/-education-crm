<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'; dot?: boolean; size?: 'sm' | 'md' }>(), {
  variant: 'neutral',
  dot: false,
  size: 'md',
});
</script>

<template>
  <span class="badge" :class="[`badge--${variant}`, `badge--${size}`]">
    <span v-if="dot" class="badge__dot" />
    <slot />
  </span>
</template>

<style scoped lang="scss">
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: $radius-full;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;

  &--md {
    padding: 5px 10px;
    font-size: 12px;
  }

  &--sm {
    padding: 3px 8px;
    font-size: 11px;
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  &--neutral {
    background: #f1f5f9;
    color: #475569;
  }

  &--primary {
    background: $color-primary-soft;
    color: $color-primary-hover;
  }

  &--success {
    background: $color-success-soft;
    color: darken($color-success, 5%);
  }

  &--warning {
    background: $color-warning-soft;
    color: darken($color-warning, 8%);
  }

  &--danger {
    background: $color-danger-soft;
    color: darken($color-danger, 5%);
  }

  &--info {
    background: $color-info-soft;
    color: darken($color-info, 5%);
  }

  &--purple {
    background: $color-purple-soft;
    color: $color-purple;
  }
}
</style>
