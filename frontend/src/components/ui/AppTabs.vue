<script setup lang="ts">
export interface TabItem {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

defineProps<{ tabs: TabItem[]; modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <nav class="tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      class="tabs__item"
      :class="{ 'tabs__item--active': tab.key === modelValue }"
      :disabled="tab.disabled"
      :aria-selected="tab.key === modelValue"
      @click="emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="tabs__count">{{ tab.count }}</span>
    </button>
  </nav>
</template>

<style scoped lang="scss">
.tabs {
  display: flex;
  gap: $space-1;
  border-bottom: 1px solid $color-border;
  overflow-x: auto;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: $color-text-muted;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    margin-bottom: -1px;

    &:hover:not(:disabled) {
      color: $color-text;
    }

    &--active {
      color: $color-primary;
      border-bottom-color: $color-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__count {
    background: $color-bg;
    border-radius: $radius-full;
    padding: 1px 8px;
    font-size: 12px;
    color: $color-text-muted;
  }
}
</style>
