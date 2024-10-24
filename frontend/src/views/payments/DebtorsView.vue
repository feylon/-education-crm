<script setup lang="ts">
import { groupsApi } from '@/api/groups.api';
import { paymentsApi } from '@/api/payments.api';
import type { Debtor, Group, Student } from '@/api/types';
import { AppAvatar, AppBadge, AppButton, AppCard, AppInput, AppPageHeader, AppPagination, AppSearchSelect, AppTable, type TableColumn } from '@/components/ui';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import PaymentFormModal from './PaymentFormModal.vue';

const { t } = useI18n();
const router = useRouter();
const { can } = usePermissions();
const { money, date } = useFormatters();

const list = usePagination<Debtor, { groupId?: string | null; minDebt?: number | string }>((query) => paymentsApi.debtors(query), { sortBy: 'debt', sortOrder: 'DESC' });
const columns = computed<TableColumn[]>(() => [
  { key: 'lastName', label: t('payments.student'), sortable: true },
  { key: 'groups', label: t('debtors.groups'), hideBelow: 'md' },
  { key: 'totalInvoiced', label: t('payments.totalInvoiced'), align: 'right', hideBelow: 'lg' },
  { key: 'totalPaid', label: t('payments.totalPaid'), align: 'right', hideBelow: 'lg' },
  { key: 'debt', label: t('debtors.debt'), sortable: true, align: 'right' },
  { key: 'overdueInvoices', label: t('debtors.overdue'), align: 'center', hideBelow: 'md' },
  { key: 'oldestDueDate', label: t('debtors.oldestDue'), sortable: true, hideBelow: 'md' },
  { key: 'actions', label: '', width: '140px', align: 'right' },
]);
const pageDebt = computed(() => list.items.value.reduce((sum, row) => sum + row.debt, 0));
const fetchGroups = (search: string): Promise<Group[]> => groupsApi.lookup(search);

const payOpen = ref(false);
const payStudent = ref<Student | null>(null);
const openPay = (debtor: Debtor): void => {
  payStudent.value = { id: debtor.studentId, firstName: debtor.firstName, lastName: debtor.lastName, phone: debtor.phone } as Student;
  payOpen.value = true;
};
const openStudent = (debtor: Debtor): void => void router.push({ name: 'student-detail', params: { id: debtor.studentId } });
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('debtors.title')" :subtitle="t('debtors.subtitle')" />
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <div style="width: 220px"><AppSearchSelect v-model="list.filters.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :placeholder="t('debtors.groups')" /></div>
        <AppInput v-model="list.filters.minDebt" type="number" min="0" :placeholder="t('debtors.minDebt')" style="width: 170px" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" row-key="studentId" clickable :empty-title="t('debtors.none')" empty-hint="" @sort="list.toggleSort" @row-click="openStudent" @retry="list.reload">
        <template #cell-lastName="{ row }">
          <div class="flex items-center gap-3">
            <AppAvatar :src="row.photoUrl" :name="`${row.firstName} ${row.lastName}`" :size="34" />
            <div><p class="fw-600">{{ row.lastName }} {{ row.firstName }}</p><p class="text-muted" style="font-size: 12px">{{ row.phone }}</p></div>
          </div>
        </template>
        <template #cell-groups="{ value }"><div class="flex gap-1 flex-wrap"><AppBadge v-for="name in value" :key="name" size="sm" variant="primary">{{ name }}</AppBadge></div></template>
        <template #cell-totalInvoiced="{ value }"><span class="mono">{{ money(value) }}</span></template>
        <template #cell-totalPaid="{ value }"><span class="mono">{{ money(value) }}</span></template>
        <template #cell-debt="{ value }"><span class="mono fw-600 text-danger">{{ money(value) }}</span></template>
        <template #cell-overdueInvoices="{ value }"><AppBadge :variant="value > 0 ? 'danger' : 'neutral'" size="sm">{{ value }}</AppBadge></template>
        <template #cell-oldestDueDate="{ value }">{{ date(value) }}</template>
        <template #cell-actions="{ row }">
          <AppButton v-if="can('payments.create')" size="sm" variant="secondary" icon="money" @click.stop="openPay(row)">{{ t('debtors.collect') }}</AppButton>
        </template>
      </AppTable>
      <template #footer>
        <span class="text-muted">{{ t('debtors.totalDebt') }}: <strong class="mono text-danger">{{ money(pageDebt) }}</strong></span>
      </template>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <PaymentFormModal v-model:open="payOpen" :student="payStudent" @saved="list.reload()" />
  </div>
</template>
