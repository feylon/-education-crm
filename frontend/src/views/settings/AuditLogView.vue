<script setup lang="ts">
import { usersApi } from '@/api/users.api';
import type { AuditLog } from '@/api/types';
import { AppBadge, AppButton, AppCard, AppInput, AppModal, AppPageHeader, AppPagination, AppSelect, AppTable, type TableColumn } from '@/components/ui';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, te } = useI18n();
const { dateTime } = useFormatters();

const list = usePagination<AuditLog, { action?: string; entity?: string; from?: string; to?: string }>((query) => usersApi.auditLogs(query), { sortBy: 'createdAt', sortOrder: 'DESC' });
const columns = computed<TableColumn[]>(() => [
  { key: 'createdAt', label: t('common.date'), sortable: true, width: '170px' },
  { key: 'userEmail', label: t('audit.user') },
  { key: 'action', label: t('audit.action'), sortable: true },
  { key: 'entity', label: t('audit.entity'), sortable: true },
  { key: 'entityId', label: t('audit.entityId'), hideBelow: 'lg' },
  { key: 'ip', label: t('audit.ip'), hideBelow: 'lg' },
]);
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ASSIGN', 'UNASSIGN', 'MARK_ATTENDANCE', 'PAYMENT', 'REFUND', 'GENERATE'];
const actionOptions = ACTIONS.map((action) => ({ value: action, label: t(`audit.actions.${action}`) }));
const actionLabel = (action: string): string => (te(`audit.actions.${action}`) ? t(`audit.actions.${action}`) : action);
const variantFor = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' => {
  if (action === 'CREATE' || action === 'PAYMENT') return 'success';
  if (action === 'UPDATE' || action === 'MARK_ATTENDANCE') return 'info';
  if (action === 'DELETE' || action === 'REFUND') return 'danger';
  if (action === 'LOGIN' || action === 'LOGOUT') return 'neutral';
  return 'primary';
};

const detail = ref<AuditLog | null>(null);
const pretty = (value: Record<string, unknown> | null): string => (value ? JSON.stringify(value, null, 2) : '—');
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('audit.title')" :subtitle="t('audit.subtitle')" />
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <AppSelect v-model="list.filters.action" :options="actionOptions" :placeholder="t('audit.action')" style="width: 190px" />
        <AppInput v-model="list.filters.entity" :placeholder="t('audit.entity')" style="width: 160px" />
        <AppInput v-model="list.filters.from" type="date" style="width: 160px" />
        <AppInput v-model="list.filters.to" type="date" style="width: 160px" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" clickable dense @sort="list.toggleSort" @row-click="detail = $event" @retry="list.reload">
        <template #cell-createdAt="{ value }"><span class="mono">{{ dateTime(value) }}</span></template>
        <template #cell-userEmail="{ value }">{{ value ?? t('audit.system') }}</template>
        <template #cell-action="{ value }"><AppBadge :variant="variantFor(value)" size="sm">{{ actionLabel(value) }}</AppBadge></template>
        <template #cell-entityId="{ value }"><span class="mono text-muted" style="font-size: 12px">{{ value ? value.slice(0, 8) : '—' }}</span></template>
        <template #cell-ip="{ value }">{{ value ?? '—' }}</template>
      </AppTable>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <AppModal :open="!!detail" :title="detail ? `${actionLabel(detail.action)} · ${detail.entity}` : ''" size="lg" @update:open="detail = null">
      <template v-if="detail">
        <dl class="meta">
          <dt>{{ t('audit.user') }}</dt><dd>{{ detail.userEmail ?? t('audit.system') }}</dd>
          <dt>{{ t('common.date') }}</dt><dd>{{ dateTime(detail.createdAt) }}</dd>
          <dt>{{ t('audit.entityId') }}</dt><dd class="mono">{{ detail.entityId ?? '—' }}</dd>
          <dt>{{ t('audit.ip') }}</dt><dd>{{ detail.ip ?? '—' }}</dd>
        </dl>
        <div class="diff">
          <div><p class="fw-600 mb-4">{{ t('audit.before') }}</p><pre>{{ pretty(detail.oldValue) }}</pre></div>
          <div><p class="fw-600 mb-4">{{ t('audit.after') }}</p><pre>{{ pretty(detail.newValue) }}</pre></div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.meta {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px $space-4;
  margin: 0 0 $space-4;
  font-size: 13px;

  dt {
    color: $color-text-muted;
  }

  dd {
    margin: 0;
  }
}

.diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;

  @include down($bp-md) {
    grid-template-columns: 1fr;
  }

  pre {
    margin: 0;
    padding: $space-3;
    background: #0f172a;
    color: #e2e8f0;
    border-radius: $radius-md;
    font-size: 12px;
    overflow: auto;
    max-height: 360px;
  }
}
</style>
