<script setup lang="ts" generic="T extends Record<string, any>">
import { useI18n } from 'vue-i18n';
import AppEmpty from './AppEmpty.vue';
import AppErrorState from './AppErrorState.vue';
import AppIcon from './AppIcon.vue';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  hideBelow?: 'sm' | 'md' | 'lg';
}

withDefaults(
  defineProps<{
    columns: TableColumn[];
    rows: T[];
    loading?: boolean;
    error?: string | null;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    rowKey?: string;
    clickable?: boolean;
    emptyTitle?: string;
    emptyHint?: string;
    dense?: boolean;
  }>(),
  { loading: false, error: null, rowKey: 'id', clickable: false, dense: false },
);
const emit = defineEmits<{ sort: [key: string]; rowClick: [row: T]; retry: [] }>();
const { t } = useI18n();
</script>

<template>
  <div class="table-wrap">
    <table class="table" :class="{ 'table--dense': dense, 'table--clickable': clickable }">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ width: column.width }"
            :class="[`table__th--${column.align ?? 'left'}`, column.hideBelow ? `hide-below-${column.hideBelow}` : '', { 'table__th--sortable': column.sortable }]"
            @click="column.sortable && emit('sort', column.key)"
          >
            <span class="table__th-inner">
              {{ column.label }}
              <AppIcon v-if="column.sortable && sortBy === column.key" :name="sortOrder === 'ASC' ? 'chevronDown' : 'chevronDown'" :size="14" :class="{ 'rotate-180': sortOrder === 'ASC' }" />
            </span>
          </th>
        </tr>
      </thead>
      <tbody v-if="!error">
        <tr v-if="loading && rows.length === 0" v-for="index in 5" :key="`skeleton-${index}`" class="table__skeleton">
          <td v-for="column in columns" :key="column.key"><span class="skeleton" /></td>
        </tr>
        <tr v-for="row in rows" :key="String(row[rowKey])" :class="{ 'table__row--loading': loading }" @click="clickable && emit('rowClick', row)">
          <td v-for="column in columns" :key="column.key" :class="[`table__td--${column.align ?? 'left'}`, column.hideBelow ? `hide-below-${column.hideBelow}` : '']">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">{{ row[column.key] ?? '—' }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
    <AppErrorState v-if="error" :message="error" @retry="emit('retry')" />
    <AppEmpty v-else-if="!loading && rows.length === 0" :title="emptyTitle ?? t('common.noResults')" :hint="emptyHint ?? t('common.noResultsHint')" />
  </div>
</template>

<style scoped lang="scss">
.table-wrap {
  overflow-x: auto;
  width: 100%;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    padding: 12px $space-4;
    text-align: left;
    border-bottom: 1px solid $color-border;
    vertical-align: middle;
  }

  &--dense th,
  &--dense td {
    padding: 8px $space-3;
  }

  th {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $color-text-muted;
    background: #fafbfd;
    white-space: nowrap;
    user-select: none;
  }

  &__th--sortable {
    cursor: pointer;

    &:hover {
      color: $color-text;
    }
  }

  &__th-inner {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  &__th--right,
  &__td--right {
    text-align: right;
  }

  &__th--center,
  &__td--center {
    text-align: center;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  &--clickable tbody tr:not(.table__skeleton) {
    cursor: pointer;

    &:hover {
      background: #f8fafc;
    }
  }

  &__row--loading {
    opacity: 0.6;
  }
}

.skeleton {
  display: block;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #eef1f6 25%, #f7f8fb 50%, #eef1f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

.rotate-180 {
  transform: rotate(180deg);
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

@include down($bp-sm) {
  .hide-below-sm {
    display: none;
  }
}

@include down($bp-md) {
  .hide-below-md {
    display: none;
  }
}

@include down($bp-lg) {
  .hide-below-lg {
    display: none;
  }
}
</style>
