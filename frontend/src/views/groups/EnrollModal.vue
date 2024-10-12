<script setup lang="ts">
import { groupsApi } from '@/api/groups.api';
import { studentsApi } from '@/api/students.api';
import type { Enrollment, Student } from '@/api/types';
import { AppButton, AppFormField, AppInput, AppModal, AppSearchSelect, AppSelect, AppTextarea } from '@/components/ui';
import { rules, useForm } from '@/composables/useForm';
import { todayIso } from '@/composables/useFormatters';
import { useToast } from '@/composables/useToast';
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ open: boolean; groupId: string; enrollment?: Enrollment | null }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>();
const { t } = useI18n();
const toast = useToast();

const form = useForm(
  { studentId: '' as string | null, joinedAt: todayIso(), discountPercent: 0 as number | string, status: 'ACTIVE' as Enrollment['status'], notes: '' },
  {
    studentId: [(value) => (props.enrollment || value ? true : t('validation.required'))],
    discountPercent: [rules.min(0, t('validation.min', { n: 0 })), rules.max(100, t('validation.max', { n: 100 }))],
  },
);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const enrollment = props.enrollment;
    form.reset(
      enrollment
        ? { studentId: enrollment.studentId, joinedAt: enrollment.joinedAt, discountPercent: enrollment.discountPercent, status: enrollment.status, notes: enrollment.notes ?? '' }
        : { studentId: '', joinedAt: todayIso(), discountPercent: 0, status: 'ACTIVE', notes: '' },
    );
  },
  { immediate: true },
);

const save = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    if (props.enrollment) {
      await groupsApi.updateEnrollment(props.groupId, props.enrollment.id, { discountPercent: Number(values.discountPercent), status: values.status, notes: values.notes.trim() || undefined });
    } else {
      await groupsApi.enroll(props.groupId, { studentId: values.studentId as string, joinedAt: values.joinedAt, discountPercent: Number(values.discountPercent), notes: values.notes.trim() || undefined });
    }
    toast.success(t('common.saved'));
    emit('saved');
    emit('update:open', false);
  });
  if (!ok && form.serverError.value) toast.error(t('common.errorTitle'), form.serverError.value);
};

const fetchStudents = (search: string): Promise<Student[]> => studentsApi.lookup(search);
const STATUS_OPTIONS = ['ACTIVE', 'LEFT', 'COMPLETED'].map((status) => ({ value: status, label: t(`status.${status}`) }));
</script>

<template>
  <AppModal :open="open" :title="enrollment ? t('groups.editEnrollment') : t('groups.enrollTitle')" size="sm" @update:open="emit('update:open', $event)">
    <div class="flex-col">
      <AppFormField v-if="!enrollment" :label="t('groups.student')" :error="form.errors.studentId" required>
        <AppSearchSelect v-model="form.values.studentId" :fetcher="fetchStudents" :label-of="(item: Student) => `${item.lastName} ${item.firstName}`" :hint-of="(item: Student) => item.phone" :placeholder="t('groups.searchStudent')" :invalid="!!form.errors.studentId" />
      </AppFormField>
      <AppFormField v-else :label="t('groups.student')"><AppInput :model-value="enrollment.student ? `${enrollment.student.lastName} ${enrollment.student.firstName}` : ''" disabled /></AppFormField>
      <AppFormField v-if="!enrollment" :label="t('groups.joinedAt')"><AppInput v-model="form.values.joinedAt" type="date" /></AppFormField>
      <AppFormField v-else :label="t('common.status')"><AppSelect v-model="form.values.status" :options="STATUS_OPTIONS" :clearable="false" /></AppFormField>
      <AppFormField :label="t('groups.discount')" :error="form.errors.discountPercent"><AppInput v-model="form.values.discountPercent" type="number" min="0" max="100" /></AppFormField>
      <AppFormField :label="t('common.notes')"><AppTextarea v-model="form.values.notes" :rows="2" /></AppFormField>
    </div>
    <template #footer>
      <AppButton variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="form.submitting.value" @click="save">{{ t('common.save') }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
</style>
