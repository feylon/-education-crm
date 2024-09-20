<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

withDefaults(defineProps<{ align?: 'left' | 'right'; width?: number }>(), { align: 'right', width: 220 });
const open = ref(false);
const root = ref<HTMLElement | null>(null);

const toggle = (): void => {
  open.value = !open.value;
};
const close = (): void => {
  open.value = false;
};
const onClickOutside = (event: MouseEvent): void => {
  if (root.value && !root.value.contains(event.target as Node)) close();
};
onMounted(() => document.addEventListener('mousedown', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside));
defineExpose({ close });
</script>

<template>
  <div ref="root" class="dropdown">
    <div class="dropdown__trigger" @click="toggle"><slot name="trigger" :open="open" /></div>
    <Transition name="fade">
      <div v-if="open" class="dropdown__menu" :class="`dropdown__menu--${align}`" :style="{ minWidth: `${width}px` }" @click="close">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.dropdown {
  position: relative;
  display: inline-block;

  &__menu {
    position: absolute;
    top: calc(100% + 6px);
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-shadow: $shadow-lg;
    padding: 6px;
    z-index: 500;

    &--right {
      right: 0;
    }

    &--left {
      left: 0;
    }
  }
}

:deep(.dropdown-item) {
  display: flex;
  align-items: center;
  gap: $space-2;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: $radius-sm;
  color: $color-text;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    background: $color-bg;
  }
}

:deep(.dropdown-item--danger) {
  color: $color-danger;
}

:deep(.dropdown-item--active) {
  background: $color-primary-soft;
  color: $color-primary-hover;
}

:deep(.dropdown-divider) {
  height: 1px;
  background: $color-border;
  margin: 6px 0;
}
</style>
