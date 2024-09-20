<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    icon?: string;
    id?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    autocomplete?: string;
  }>(),
  { type: 'text', disabled: false, invalid: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const onInput = (event: Event): void => emit('update:modelValue', (event.target as HTMLInputElement).value);
</script>

<template>
  <div class="input" :class="{ 'input--invalid': invalid, 'input--disabled': disabled, 'input--with-icon': !!icon }">
    <AppIcon v-if="icon" :name="icon" :size="18" class="input__icon" />
    <input
      :id="id"
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :min="min"
      :max="max"
      :step="step"
      :autocomplete="autocomplete"
      class="input__control"
      @input="onInput"
    />
    <slot name="suffix" />
  </div>
</template>

<style scoped lang="scss">
.input {
  display: flex;
  align-items: center;
  gap: $space-2;
  height: 38px;
  padding: 0 $space-3;
  background: $color-surface;
  border: 1px solid $color-border-strong;
  border-radius: $radius-md;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    @include focus-ring;
  }

  &--invalid {
    border-color: $color-danger;
  }

  &--disabled {
    background: $color-bg;
    opacity: 0.8;
  }

  &__icon {
    color: $color-text-soft;
  }

  &__control {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: $color-text;
    height: 100%;

    &::placeholder {
      color: $color-text-soft;
    }
  }
}
</style>
