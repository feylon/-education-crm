<script setup lang="ts">
defineProps<{ label?: string; error?: string; hint?: string; required?: boolean; forId?: string }>();
</script>

<template>
  <div class="field" :class="{ 'field--error': !!error }">
    <label v-if="label" class="field__label" :for="forId">
      {{ label }}<span v-if="required" class="field__required">*</span>
    </label>
    <slot />
    <p v-if="error" class="field__message">{{ error }}</p>
    <p v-else-if="hint" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped lang="scss">
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: $color-text;
  }

  &__required {
    color: $color-danger;
    margin-left: 2px;
  }

  &__message {
    font-size: 12px;
    color: $color-danger;
  }

  &__hint {
    font-size: 12px;
    color: $color-text-muted;
  }
}
</style>
