<script setup lang="ts">
import { paymentsApi, type PaymentPayload } from '@/api/payments.api';
import { studentsApi } from '@/api/students.api';
import type { Invoice, Payment, PaymentMethod, Student, StudentFinanceSummary } from '@/api/types';
import { AppBadge, AppButton, AppFormField, AppInput, AppModal, AppSearchSelect, AppSelect, AppTextarea } from '@/components/ui';
import { rules, useForm } from '@/composables/useForm';
import { useFormatters } from '@/composables/useFormatters';
import { useToast } from '@/composables/useToast';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ open: boolean; student?: Student | null; invoice?: Invoice | null }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [payment: Payment] }>();
const { t } = useI18n();
const toast = useToast();
const { money, date } = useFormatters();

const form = useForm(
  { studentId: '' as string | null, amount: '' as string | number, method: 'CASH' as PaymentMethod, invoiceId: '', description: '' },
  { studentId: [rules.required(t('validation.required'))], amount: [rules.required(t('validation.required')), rules.min(1, t('validation.min', { n: 1 }))] },
);
const studentLabel = ref('');
const openInvoices = ref<Invoice[]>([]);
const summary = ref<StudentFinanceSummary | null>(null);

const loadStudentContext = async (studentId: string | null): Promise<void> => {
  openInvoices.value = [];
  summary.value = null;
  if (!studentId) return;
  const [invoices, finance] = await Promise.all([
    paymentsApi.invoices({ studentId, openOnly: true, limit: 50, sortBy: 'periodMonth', sortOrder: 'ASC' }).catch(() => ({ items: [] as Invoice[] })),
    paymentsApi.studentSummary(studentId).catch(() => null),
  ]);
  openInvoices.value = invoices.items;
  summary.value = finance;
};

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    form.reset({ studentId: props.student?.id ?? props.invoice?.studentId ?? '', amount: props.invoice ? props.invoice.amount - props.invoice.paidAmount : '', method: 'CASH', invoiceId: props.invoice?.id ?? '', description: '' });
    studentLabel.value = props.student ? `${props.student.lastName} ${props.student.firstName}` : props.invoice?.student ? `${props.invoice.student.lastName} ${props.invoice.student.firstName}` : '';
    void loadStudentContext(form.values.studentId);
  },
  { immediate: true },
);

watch(() => form.values.studentId, (id) => void loadStudentContext(id));

const invoiceOptions = computed(() => openInvoices.value.map((invoice) => ({ value: invoice.id, label: `${invoice.number} · ${date(invoice.periodMonth)} · ${money(invoice.amount - invoice.paidAmount)}` })));
const selectedInvoice = computed(() => openInvoices.value.find((invoice) => invoice.id === form.values.invoiceId) ?? props.invoice ?? null);

const save = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    const payload: PaymentPayload = {
      studentId: values.studentId as string,
      amount: Number(values.amount),
      method: values.method,
      invoiceId: values.invoiceId || undefined,
      description: values.description.trim() || undefined,
    };
    const saved = await paymentsApi.create(payload);
    toast.success(t('payments.recorded'), saved.number);
    emit('saved', saved);
    emit('update:open', false);
  });
  if (!ok && form.serverError.value) toast.error(t('common.errorTitle'), form.serverError.value);
};

const METHOD_OPTIONS = ['CASH', 'CARD', 'BANK_TRANSFER', 'CONTRACT'].map((method) => ({ value: method, label: t(`status.${method}`) }));
const fetchStudents = (search: string): Promise<Student[]> => studentsApi.lookup(search);
const payFull = (): void => {
  if (selectedInvoice.value) form.values.amount = selectedInvoice.value.amount - selectedInvoice.value.paidAmount;
  else if (summary.value) form.values.amount = summary.value.debt;
};
</script>

<template>
  <AppModal :open="open" :title="t('payments.addTitle')" @update:open="emit('update:open', $event)">
    <div class="flex-col">
      <AppFormField :label="t('payments.student')" :error="form.errors.studentId" required>
        <AppSearchSelect v-model="form.values.studentId" :fetcher="fetchStudents" :label-of="(item: Student) => `${item.lastName} ${item.firstName}`" :hint-of="(item: Student) => item.phone" :initial-label="studentLabel" :disabled="!!student || !!invoice" :placeholder="t('payments.searchStudent')" :invalid="!!form.errors.studentId" />
      </AppFormField>
      <div v-if="summary" class="summary">
        <AppBadge :variant="summary.debt > 0 ? 'danger' : 'success'">{{ t('payments.debt') }}: {{ money(summary.debt) }}</AppBadge>
        <AppBadge variant="neutral">{{ t('payments.openInvoices') }}: {{ summary.openInvoices }}</AppBadge>
        <AppBadge variant="neutral">{{ t('payments.totalPaid') }}: {{ money(summary.totalPaid) }}</AppBadge>
      </div>
      <AppFormField :label="t('payments.invoice')" :hint="t('payments.invoiceHint')">
        <AppSelect v-model="form.values.invoiceId" :options="invoiceOptions" :placeholder="t('payments.anyInvoice')" :disabled="!!invoice" />
      </AppFormField>
      <div class="grid grid-2">
        <AppFormField :label="t('payments.amount')" :error="form.errors.amount" required>
          <AppInput v-model="form.values.amount" type="number" min="1" :invalid="!!form.errors.amount">
            <template #suffix><button type="button" class="link" @click="payFull">{{ t('common.all') }}</button></template>
          </AppInput>
        </AppFormField>
        <AppFormField :label="t('payments.method')"><AppSelect v-model="form.values.method" :options="METHOD_OPTIONS" :clearable="false" /></AppFormField>
      </div>
      <AppFormField :label="t('payments.description')"><AppTextarea v-model="form.values.description" :rows="2" /></AppFormField>
    </div>
    <template #footer>
      <AppButton variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="form.submitting.value" icon="money" @click="save">{{ t('payments.add') }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.summary {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
}

.link {
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
}
</style>
