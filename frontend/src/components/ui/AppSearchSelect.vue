<script setup lang="ts" generic="T extends { id: string }">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from './AppIcon.vue';

const props = withDefaults(
  defineProps<{
    modelValue: string | null | undefined;
    fetcher: (search: string) => Promise<T[]>;
    labelOf: (item: T) => string;
    hintOf?: (item: T) => string;
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    initialLabel?: string;
  }>(),
  { invalid: false, disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string | null]; select: [item: T | null] }>();
const { t } = useI18n();

const open = ref(false);
const query = ref('');
const items = shallowRef<T[]>([]);
const loading = ref(false);
const selectedLabel = ref(props.initialLabel ?? '');
const root = ref<HTMLElement | null>(null);
let timer: number | undefined;

const search = async (): Promise<void> => {
  loading.value = true;
  try {
    items.value = await props.fetcher(query.value);
  } finally {
    loading.value = false;
  }
};

watch(query, () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void search(), 300);
});

watch(
  () => props.initialLabel,
  (label) => {
    if (label) selectedLabel.value = label;
  },
);

watch(
  () => props.modelValue,
  (value) => {
    if (!value) selectedLabel.value = '';
  },
);

const openList = (): void => {
  if (props.disabled) return;
  open.value = true;
  if (items.value.length === 0) void search();
};

const choose = (item: T): void => {
  selectedLabel.value = props.labelOf(item);
  emit('update:modelValue', item.id);
  emit('select', item);
  open.value = false;
  query.value = '';
};

const clear = (): void => {
  selectedLabel.value = '';
  emit('update:modelValue', null);
  emit('select', null);
};

const onClickOutside = (event: MouseEvent): void => {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener('mousedown', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside));
</script>

<template>
  <div ref="root" class="search-select" :class="{ 'search-select--invalid': invalid, 'search-select--disabled': disabled }">
    <div class="search-select__control" @click="openList">
      <AppIcon name="search" :size="18" class="search-select__icon" />
      <input
        v-if="open || !modelValue"
        v-model="query"
        class="search-select__input"
        :placeholder="placeholder ?? t('common.search')"
        :disabled="disabled"
        @focus="openList"
      />
      <span v-else class="search-select__value">{{ selectedLabel }}</span>
      <button v-if="modelValue && !disabled" type="button" class="search-select__clear" @click.stop="clear"><AppIcon name="x" :size="16" /></button>
    </div>
    <Transition name="fade">
      <ul v-if="open" class="search-select__list">
        <li v-if="loading" class="search-select__state">{{ t('common.loading') }}</li>
        <li v-else-if="items.length === 0" class="search-select__state">{{ t('common.noResults') }}</li>
        <li v-for="item in items" :key="item.id" class="search-select__option" @click="choose(item)">
          <span>{{ labelOf(item) }}</span>
          <span v-if="hintOf" class="search-select__hint">{{ hintOf(item) }}</span>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.search-select {
  position: relative;

  &__control {
    display: flex;
    align-items: center;
    gap: $space-2;
    height: 38px;
    padding: 0 $space-3;
    border: 1px solid $color-border-strong;
    border-radius: $radius-md;
    background: $color-surface;
    cursor: text;

    &:focus-within {
      @include focus-ring;
    }
  }

  &--invalid &__control {
    border-color: $color-danger;
  }

  &--disabled &__control {
    background: $color-bg;
    cursor: not-allowed;
  }

  &__icon {
    color: $color-text-soft;
  }

  &__input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    min-width: 0;
  }

  &__value {
    flex: 1;
    @include truncate;
  }

  &__clear {
    border: none;
    background: transparent;
    color: $color-text-soft;
    cursor: pointer;
    display: grid;
    place-items: center;

    &:hover {
      color: $color-text;
    }
  }

  &__list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 260px;
    overflow-y: auto;
    margin: 0;
    padding: 6px;
    list-style: none;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    box-shadow: $shadow-lg;
    z-index: 600;
  }

  &__option {
    display: flex;
    justify-content: space-between;
    gap: $space-3;
    padding: 8px 10px;
    border-radius: $radius-sm;
    cursor: pointer;

    &:hover {
      background: $color-bg;
    }
  }

  &__hint {
    color: $color-text-muted;
    font-size: 12px;
  }

  &__state {
    padding: 10px;
    color: $color-text-muted;
    font-size: 13px;
    text-align: center;
  }
}
</style>
