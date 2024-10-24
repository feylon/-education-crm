<script setup lang="ts">
import { paymentsApi } from '@/api/payments.api';
import type { Payment } from '@/api/types';
import { AppButton, AppCard, AppFormField, AppInput, AppModal, AppPageHeader, AppPagination, AppSelect, AppTable, AppTextarea, StatusBadge, type TableColumn } from '@/components/ui';
import { rules, useForm } from '@/composables/useForm';
import { useFormatters } from '@/composables/useFormatters';
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
const { can } = usePermissions();
const { money, dateTime, fullName } = useFormatters();

const list = usePagination<Payment, { method?: string; status?: string; from?: string; to?: string }>((query) => paymentsApi.list(query), { sortBy: 'paidAt', sortOrder: 'DESC' });
const columns = computed<TableColumn[]>(() => [
  { key: 'number', label: t('payments.number'), sortable: true },
  { key: 'student', label: t('payments.student') },
  { key: 'group', label: t('payments.group'), hideBelow: 'lg' },
  { key: 'paidAt', label: t('payments.paidAt'), sortable: true, hideBelow: 'md' },
  { key: 'method', label: t('payments.method'), sortable: true, hideBelow: 'md' },
  { key: 'amount', label: t('payments.amount'), sortable: true, align: 'right' },
  { key: 'status', label: t('common.status'), sortable: true },
  { key: 'actions', label: '', width: '120px', align: 'right' },
]);
const METHOD_OPTIONS = ['CASH', 'CARD', 'BANK_TRANSFER', 'CONTRACT'].map((method) => ({ value: method, label: t(`status.${method}`) }));
const STATUS_OPTIONS = ['COMPLETED', 'REFUNDED', 'CANCELLED'].map((status) => ({ value: status, label: t(`status.${status}`) }));

const total = computed(() => list.items.value.filter((payment) => payment.status === 'COMPLETED').reduce((sum, payment) => sum + payment.amount, 0));

const formOpen = ref(false);
const refundOpen = ref(false);
const refundTarget = ref<Payment | null>(null);
const refundMode = ref<'refund' | 'cancel'>('refund');
const refundForm = useForm({ reason: '' }, { reason: [rules.required(t('validation.required'))] });

const openRefund = (payment: Payment, mode: 'refund' | 'cancel'): void => {
  refundTarget.value = payment;
  refundMode.value = mode;
  refundForm.reset();
  refundOpen.value = true;
};
const submitRefund = async (): Promise<void> => {
  const ok = await refundForm.submit(async (values) => {
    if (!refundTarget.value) return;
    if (refundMode.value === 'refund') await paymentsApi.refund(refundTarget.value.id, values.reason.trim());
    else await paymentsApi.cancel(refundTarget.value.id, values.reason.trim());
    toast.success(refundMode.value === 'refund' ? t('payments.refunded') : t('payments.cancelled'));
  });
  if (ok) {
    refundOpen.value = false;
    await list.reload();
  } else if (refundForm.serverError.value) toast.error(t('common.errorTitle'), refundForm.serverError.value);
};
const openStudent = (payment: Payment): void => void router.push({ name: 'student-detail', params: { id: payment.studentId } });
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('payments.title')" :subtitle="t('payments.subtitle')">
      <template #actions>
        <AppButton v-if="can('payments.create')" icon="money" @click="formOpen = true">{{ t('payments.add') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <AppSelect v-model="list.filters.method" :options="METHOD_OPTIONS" :placeholder="t('payments.method')" style="width: 170px" />
        <AppSelect v-model="list.filters.status" :options="STATUS_OPTIONS" :placeholder="t('common.status')" style="width: 160px" />
        <AppInput v-model="list.filters.from" type="date" style="width: 160px" />
        <AppInput v-model="list.filters.to" type="date" style="width: 160px" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" clickable @sort="list.toggleSort" @row-click="openStudent" @retry="list.reload">
        <template #cell-number="{ value }"><span class="mono fw-600">{{ value }}</span></template>
        <template #cell-student="{ row }"><span class="fw-600">{{ fullName(row.student) }}</span><p class="text-muted" style="font-size: 12px">{{ row.student?.phone }}</p></template>
        <template #cell-group="{ row }">{{ row.group?.name ?? '—' }}</template>
        <template #cell-paidAt="{ value }">{{ dateTime(value) }}</template>
        <template #cell-method="{ value }">{{ t(`status.${value}`) }}</template>
        <template #cell-amount="{ value, row }"><span class="mono fw-600" :class="{ 'text-muted': row.status !== 'COMPLETED' }">{{ money(value) }}</span></template>
        <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        <template #cell-actions="{ row }">
          <div v-if="can('payments.update') && row.status === 'COMPLETED'" class="flex gap-1" style="justify-content: flex-end" @click.stop>
            <AppButton variant="ghost" size="sm" @click="openRefund(row, 'refund')">{{ t('payments.refund') }}</AppButton>
            <AppButton variant="ghost" size="sm" icon="x" icon-only :title="t('payments.cancel')" @click="openRefund(row, 'cancel')" />
          </div>
        </template>
      </AppTable>
      <template #footer>
        <div class="flex justify-between items-center flex-wrap gap-2">
          <span class="text-muted">{{ t('common.total') }} ({{ t('common.page') }}): <strong class="mono">{{ money(total) }}</strong></span>
        </div>
      </template>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <PaymentFormModal v-model:open="formOpen" @saved="list.reload()" />
    <AppModal v-model:open="refundOpen" :title="refundMode === 'refund' ? t('payments.refundTitle', { number: refundTarget?.number ?? '' }) : t('payments.cancelTitle', { number: refundTarget?.number ?? '' })" size="sm">
      <AppFormField :label="t('payments.refundReason')" :error="refundForm.errors.reason" required>
        <AppTextarea v-model="refundForm.values.reason" :rows="3" :invalid="!!refundForm.errors.reason" />
      </AppFormField>
      <template #footer>
        <AppButton variant="outline" @click="refundOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton variant="danger" :loading="refundForm.submitting.value" @click="submitRefund">{{ refundMode === 'refund' ? t('payments.refund') : t('payments.cancel') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
