<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppButton from './AppButton.vue';
import AppSelect from './AppSelect.vue';

const props = defineProps<{ page: number; totalPages: number; total: number; limit: number }>();
const emit = defineEmits<{ 'update:page': [value: number]; 'update:limit': [value: number] }>();
const { t } = useI18n();

const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1));
const to = computed(() => Math.min(props.page * props.limit, props.total));

const pages = computed<Array<number | '…'>>(() => {
  const total = props.totalPages;
  const current = props.page;
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const result: Array<number | '…'> = [1];
  if (current > 3) result.push('…');
  for (let value = Math.max(2, current - 1); value <= Math.min(total - 1, current + 1); value += 1) result.push(value);
  if (current < total - 2) result.push('…');
  result.push(total);
  return result;
});

const limitOptions = [10, 20, 50, 100].map((value) => ({ value, label: String(value) }));
</script>

<template>
  <div class="pagination">
    <p class="pagination__summary text-muted">{{ t('common.showing', { from, to, total }) }}</p>
    <div class="pagination__controls">
      <div class="pagination__limit">
        <span class="text-muted">{{ t('common.perPage') }}</span>
        <AppSelect :model-value="limit" :options="limitOptions" :clearable="false" @update:model-value="emit('update:limit', Number($event))" />
      </div>
      <div class="pagination__pages">
        <AppButton variant="outline" size="sm" icon="chevronLeft" icon-only :disabled="page <= 1" @click="emit('update:page', page - 1)" />
        <template v-for="(item, index) in pages" :key="index">
          <span v-if="item === '…'" class="pagination__dots">…</span>
          <AppButton v-else :variant="item === page ? 'primary' : 'outline'" size="sm" @click="emit('update:page', item)">{{ item }}</AppButton>
        </template>
        <AppButton variant="outline" size="sm" icon="chevronRight" icon-only :disabled="page >= totalPages" @click="emit('update:page', page + 1)" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-3 $space-4;
  flex-wrap: wrap;
  border-top: 1px solid $color-border;

  &__summary {
    font-size: 13px;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: $space-4;
    flex-wrap: wrap;
  }

  &__limit {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: 13px;

    :deep(.select) {
      height: 32px;
      width: 72px;
    }
  }

  &__pages {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__dots {
    padding: 0 4px;
    color: $color-text-soft;
  }
}
</style>
