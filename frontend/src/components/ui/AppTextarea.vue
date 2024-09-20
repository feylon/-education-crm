<script setup lang="ts">
withDefaults(defineProps<{ modelValue: string | null | undefined; placeholder?: string; rows?: number; disabled?: boolean; invalid?: boolean; id?: string }>(), {
  rows: 3,
  disabled: false,
  invalid: false,
});
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const onInput = (event: Event): void => emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
</script>

<template>
  <textarea :id="id" class="textarea" :class="{ 'textarea--invalid': invalid }" :value="modelValue ?? ''" :placeholder="placeholder" :rows="rows" :disabled="disabled" @input="onInput" />
</template>

<style scoped lang="scss">
.textarea {
  width: 100%;
  padding: $space-2 $space-3;
  background: $color-surface;
  border: 1px solid $color-border-strong;
  border-radius: $radius-md;
  color: $color-text;
  resize: vertical;
  line-height: 1.5;

  &:focus {
    @include focus-ring;
  }

  &--invalid {
    border-color: $color-danger;
  }

  &:disabled {
    background: $color-bg;
  }
}
</style>
