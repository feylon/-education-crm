<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const onChange = (event: Event): void => emit('update:modelValue', (event.target as HTMLInputElement).checked);
</script>

<template>
  <label class="checkbox" :class="{ 'checkbox--disabled': disabled }">
    <input type="checkbox" class="checkbox__input" :checked="modelValue" :disabled="disabled" @change="onChange" />
    <span class="checkbox__box" />
    <span v-if="label || $slots.default" class="checkbox__label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped lang="scss">
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  cursor: pointer;
  user-select: none;

  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &__input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .checkbox__box {
      background: $color-primary;
      border-color: $color-primary;

      &::after {
        opacity: 1;
      }
    }

    &:focus-visible + .checkbox__box {
      @include focus-ring;
    }
  }

  &__box {
    width: 18px;
    height: 18px;
    border: 1.5px solid $color-border-strong;
    border-radius: 5px;
    background: $color-surface;
    position: relative;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 1px;
      width: 5px;
      height: 10px;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      opacity: 0;
    }
  }

  &__label {
    font-size: 14px;
  }
}
</style>
