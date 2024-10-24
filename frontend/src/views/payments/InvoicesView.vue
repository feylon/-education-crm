<script setup lang="ts">
import { groupsApi } from '@/api/groups.api';
import { paymentsApi } from '@/api/payments.api';
import type { Group, Invoice } from '@/api/types';
import { AppButton, AppCard, AppCheckbox, AppFormField, AppInput, AppModal, AppPageHeader, AppPagination, AppSearchSelect, AppSelect, AppTable, StatusBadge, type TableColumn } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { useConfirm } from '@/composables/useConfirm';
import { rules, useForm } from '@/composables/useForm';
import { firstOfMonthIso, useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import PaymentFormModal from './PaymentFormModal.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();
const { money, date, monthLabel, fullName } = useFormatters();

const list = usePagination<Invoice, { status?: string; groupId?: string | null; openOnly?: boolean; periodMonth?: string }>((query) => paymentsApi.invoices(query), { sortBy: 'periodMonth', sortOrder: 'DESC' });
const columns = computed<TableColumn[]>(() => [
  { key: 'number', label: t('invoices.number'), sortable: true },
  { key: 'student', label: t('invoices.student') },
  { key: 'group', label: t('invoices.group'), hideBelow: 'lg' },
  { key: 'periodMonth', label: t('invoices.periodMonth'), sortable: true, hideBelow: 'md' },
  { key: 'dueDate', label: t('invoices.dueDate'), sortable: true, hideBelow: 'md' },
  { key: 'amount', label: t('invoices.amount'), sortable: true, align: 'right' },
  { key: 'paidAmount', label: t('invoices.paidAmount'), align: 'right', hideBelow: 'lg' },
  { key: 'status', label: t('common.status'), sortable: true },
  { key: 'actions', label: '', width: '120px', align: 'right' },
]);
const STATUS_OPTIONS = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'].map((status) => ({ value: status, label: t(`status.${status}`) }));
const fetchGroups = (search: string): Promise<Group[]> => groupsApi.lookup(search);

const payOpen = ref(false);
const payInvoice = ref<Invoice | null>(null);
const openPay = (invoice: Invoice): void => {
  payInvoice.value = invoice;
  payOpen.value = true;
};

const cancel = async (invoice: Invoice): Promise<void> => {
  if (!(await confirm({ title: t('invoices.cancel'), message: t('invoices.cancelConfirm', { number: invoice.number }), danger: true, confirmText: t('invoices.cancel') }))) return;
  try {
    await paymentsApi.cancelInvoice(invoice.id);
    toast.success(t('invoices.cancelled'));
    await list.reload();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};

const generateOpen = ref(false);
const generateForm = useForm(
  { periodMonth: firstOfMonthIso(0).slice(0, 7), groupId: null as string | null, dueDay: 10 as number | string },
  { periodMonth: [rules.required(t('validation.required'))], dueDay: [rules.min(1, t('validation.min', { n: 1 })), rules.max(28, t('validation.max', { n: 28 }))] },
);
const generate = async (): Promise<void> => {
  const ok = await generateForm.submit(async (values) => {
    const result = await paymentsApi.generateInvoices({ periodMonth: `${values.periodMonth}-01`, groupId: values.groupId ?? undefined, dueDay: Number(values.dueDay) });
    toast.success(t('invoices.generated', { created: result.created, amount: money(result.totalAmount), skipped: result.skipped }));
  });
  if (ok) {
    generateOpen.value = false;
    await list.reload();
  } else if (generateForm.serverError.value) toast.error(t('common.errorTitle'), generateForm.serverError.value);
};
const openStudent = (invoice: Invoice): void => void router.push({ name: 'student-detail', params: { id: invoice.studentId } });
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('invoices.title')" :subtitle="t('invoices.subtitle')">
      <template #actions>
        <AppButton v-if="can('invoices.create')" icon="refresh" @click="generateOpen = true">{{ t('invoices.generate') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <div style="width: 220px"><AppSearchSelect v-model="list.filters.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :placeholder="t('invoices.group')" /></div>
        <AppSelect v-model="list.filters.status" :options="STATUS_OPTIONS" :placeholder="t('common.status')" style="width: 170px" />
        <AppInput v-model="list.filters.periodMonth" type="month" style="width: 170px" />
        <AppCheckbox :model-value="!!list.filters.openOnly" :label="t('invoices.openOnly')" @update:model-value="list.filters.openOnly = $event || undefined" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" clickable @sort="list.toggleSort" @row-click="openStudent" @retry="list.reload">
        <template #cell-number="{ value }"><span class="mono fw-600">{{ value }}</span></template>
        <template #cell-student="{ row }"><span class="fw-600">{{ fullName(row.student) }}</span></template>
        <template #cell-group="{ row }">{{ row.group?.name ?? '—' }}</template>
        <template #cell-periodMonth="{ value }">{{ monthLabel(value.slice(0, 7)) }}</template>
        <template #cell-dueDate="{ value, row }"><span :class="{ 'text-danger': row.status === 'OVERDUE' }">{{ date(value) }}</span></template>
        <template #cell-amount="{ value }"><span class="mono fw-600">{{ money(value) }}</span></template>
        <template #cell-paidAmount="{ value }"><span class="mono">{{ money(value) }}</span></template>
        <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1" style="justify-content: flex-end" @click.stop>
            <AppButton v-if="can('payments.create') && ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(row.status)" size="sm" variant="secondary" @click="openPay(row)">{{ t('invoices.pay') }}</AppButton>
            <AppButton v-if="can('invoices.update') && row.paidAmount === 0 && row.status !== 'CANCELLED'" variant="ghost" size="sm" icon="x" icon-only :title="t('invoices.cancel')" @click="cancel(row)" />
          </div>
        </template>
      </AppTable>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <PaymentFormModal v-model:open="payOpen" :invoice="payInvoice" @saved="list.reload()" />
    <AppModal v-model:open="generateOpen" :title="t('invoices.generateTitle')" size="sm">
      <p class="text-muted mb-4">{{ t('invoices.generateHint') }}</p>
      <div class="flex-col">
        <AppFormField :label="t('invoices.periodMonth')" :error="generateForm.errors.periodMonth" required><AppInput v-model="generateForm.values.periodMonth" type="month" /></AppFormField>
        <AppFormField :label="t('invoices.group')"><AppSearchSelect v-model="generateForm.values.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :placeholder="t('lessons.allGroups')" /></AppFormField>
        <AppFormField :label="t('invoices.dueDay')" :error="generateForm.errors.dueDay"><AppInput v-model="generateForm.values.dueDay" type="number" min="1" max="28" /></AppFormField>
      </div>
      <template #footer>
        <AppButton variant="outline" @click="generateOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="generateForm.submitting.value" @click="generate">{{ t('invoices.generate') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
</style>
