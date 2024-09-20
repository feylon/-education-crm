<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="switch" :class="{ 'switch--on': modelValue, 'switch--disabled': disabled }">
    <button type="button" class="switch__track" role="switch" :aria-checked="modelValue" :disabled="disabled" @click="emit('update:modelValue', !modelValue)">
      <span class="switch__thumb" />
    </button>
    <span v-if="label" class="switch__label">{{ label }}</span>
  </label>
</template>

<style scoped lang="scss">
.switch {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  cursor: pointer;

  &--disabled {
    opacity: 0.6;
  }

  &__track {
    width: 40px;
    height: 22px;
    border-radius: $radius-full;
    border: none;
    background: $color-border-strong;
    position: relative;
    cursor: pointer;
    transition: background 0.15s ease;
    padding: 0;

    &:focus-visible {
      @include focus-ring;
    }
  }

  &__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s ease;
    box-shadow: $shadow-sm;
  }

  &--on .switch__track {
    background: $color-primary;
  }

  &--on .switch__thumb {
    transform: translateX(18px);
  }

  &__label {
    font-size: 14px;
  }
}
</style>
