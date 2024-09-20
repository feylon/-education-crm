<script setup lang="ts">
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    id?: string;
    clearable?: boolean;
  }>(),
  { disabled: false, invalid: false, clearable: true },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const onChange = (event: Event): void => emit('update:modelValue', (event.target as HTMLSelectElement).value);
</script>

<template>
  <select :id="id" class="select" :class="{ 'select--invalid': invalid }" :value="modelValue ?? ''" :disabled="disabled" @change="onChange">
    <option v-if="placeholder || clearable" value="">{{ placeholder ?? '—' }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">{{ option.label }}</option>
  </select>
</template>

<style scoped lang="scss">
.select {
  height: 38px;
  width: 100%;
  padding: 0 $space-8 0 $space-3;
  background: $color-surface
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%236b7280'><path d='M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z'/></svg>")
    no-repeat right 10px center;
  border: 1px solid $color-border-strong;
  border-radius: $radius-md;
  color: $color-text;
  appearance: none;
  cursor: pointer;

  &:focus {
    @include focus-ring;
  }

  &--invalid {
    border-color: $color-danger;
  }

  &:disabled {
    background-color: $color-bg;
    cursor: not-allowed;
  }
}
</style>
