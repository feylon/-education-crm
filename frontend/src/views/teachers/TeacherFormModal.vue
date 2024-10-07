<script setup lang="ts">
import { schedulesApi } from '@/api/schedules.api';
import { teachersApi, type TeacherPayload } from '@/api/teachers.api';
import type { Branch, Teacher } from '@/api/types';
import { AppButton, AppFormField, AppInput, AppModal, AppSelect, AppTextarea } from '@/components/ui';
import { rules, useForm } from '@/composables/useForm';
import { useToast } from '@/composables/useToast';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ open: boolean; teacher?: Teacher | null }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [teacher: Teacher] }>();
const { t } = useI18n();
const toast = useToast();

const branches = ref<Branch[]>([]);
onMounted(async () => {
  branches.value = await schedulesApi.branches().catch(() => []);
});

const emptyValues = () => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  specialization: '',
  bio: '',
  hireDate: '',
  salaryType: 'FIXED' as Teacher['salaryType'],
  salaryAmount: '' as string | number,
  status: 'ACTIVE' as Teacher['status'],
  branchId: '',
});

const form = useForm(emptyValues(), {
  firstName: [rules.required(t('validation.required'))],
  lastName: [rules.required(t('validation.required'))],
  email: [rules.required(t('validation.required')), rules.email(t('validation.email'))],
  password: [(value) => (props.teacher || value ? true : t('validation.required')), rules.minLength(8, t('validation.minLength', { n: 8 }))],
  phone: [rules.required(t('validation.required')), rules.phone(t('validation.phone'))],
  salaryAmount: [rules.min(0, t('validation.min', { n: 0 }))],
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const teacher = props.teacher;
    form.reset(
      teacher
        ? {
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            email: teacher.user?.email ?? '',
            password: '',
            phone: teacher.phone,
            specialization: teacher.specialization ?? '',
            bio: teacher.bio ?? '',
            hireDate: teacher.hireDate ?? '',
            salaryType: teacher.salaryType,
            salaryAmount: teacher.salaryAmount,
            status: teacher.status,
            branchId: teacher.branchId ?? '',
          }
        : emptyValues(),
    );
  },
  { immediate: true },
);

const clean = (value: string): string | undefined => (value.trim() === '' ? undefined : value.trim());

const save = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    const payload: TeacherPayload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      password: clean(values.password),
      phone: values.phone.trim(),
      specialization: clean(values.specialization),
      bio: clean(values.bio),
      hireDate: clean(values.hireDate),
      salaryType: values.salaryType,
      salaryAmount: values.salaryAmount === '' ? 0 : Number(values.salaryAmount),
      status: values.status,
      branchId: clean(values.branchId),
    };
    const saved = props.teacher ? await teachersApi.update(props.teacher.id, payload) : await teachersApi.create(payload);
    toast.success(props.teacher ? t('common.updated') : t('common.created'));
    emit('saved', saved);
    emit('update:open', false);
  });
  if (!ok && form.serverError.value) toast.error(t('common.errorTitle'), form.serverError.value);
};

const STATUS_OPTIONS = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'].map((status) => ({ value: status, label: t(`status.${status}`) }));
const SALARY_OPTIONS = ['FIXED', 'PERCENT', 'PER_LESSON'].map((type) => ({ value: type, label: t(`status.${type}`) }));
</script>

<template>
  <AppModal :open="open" :title="teacher ? t('teachers.edit') : t('teachers.add')" size="lg" @update:open="emit('update:open', $event)">
    <form class="form-grid" novalidate @submit.prevent="save">
      <AppFormField :label="t('students.lastName')" :error="form.errors.lastName" required><AppInput v-model="form.values.lastName" :invalid="!!form.errors.lastName" /></AppFormField>
      <AppFormField :label="t('students.firstName')" :error="form.errors.firstName" required><AppInput v-model="form.values.firstName" :invalid="!!form.errors.firstName" /></AppFormField>
      <AppFormField :label="t('teachers.loginEmail')" :error="form.errors.email" required><AppInput v-model="form.values.email" type="email" :invalid="!!form.errors.email" /></AppFormField>
      <AppFormField :label="t('teachers.loginPassword')" :error="form.errors.password" :required="!teacher" :hint="teacher ? t('users.passwordHint') : undefined">
        <AppInput v-model="form.values.password" type="password" autocomplete="new-password" :invalid="!!form.errors.password" />
      </AppFormField>
      <AppFormField :label="t('common.phone')" :error="form.errors.phone" required><AppInput v-model="form.values.phone" placeholder="+998901234567" :invalid="!!form.errors.phone" /></AppFormField>
      <AppFormField :label="t('teachers.specialization')"><AppInput v-model="form.values.specialization" /></AppFormField>
      <AppFormField :label="t('teachers.hireDate')"><AppInput v-model="form.values.hireDate" type="date" /></AppFormField>
      <AppFormField :label="t('common.status')"><AppSelect v-model="form.values.status" :options="STATUS_OPTIONS" :clearable="false" /></AppFormField>
      <AppFormField :label="t('teachers.salaryType')"><AppSelect v-model="form.values.salaryType" :options="SALARY_OPTIONS" :clearable="false" /></AppFormField>
      <AppFormField :label="t('teachers.salaryAmount')" :error="form.errors.salaryAmount"><AppInput v-model="form.values.salaryAmount" type="number" min="0" /></AppFormField>
      <AppFormField :label="t('students.branch')">
        <AppSelect v-model="form.values.branchId" :options="branches.map((branch) => ({ value: branch.id, label: branch.name }))" :placeholder="t('common.select')" />
      </AppFormField>
      <AppFormField :label="t('teachers.bio')" class="span-2"><AppTextarea v-model="form.values.bio" :rows="3" /></AppFormField>
    </form>
    <template #footer>
      <AppButton variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="form.submitting.value" @click="save">{{ t('common.save') }}</AppButton>
    </template>
  </AppModal>
</template>
