<script setup lang="ts">
import { filesApi } from '@/api/files.api';
import { schedulesApi } from '@/api/schedules.api';
import { studentsApi, type ParentPayload, type StudentPayload } from '@/api/students.api';
import type { Branch, Student } from '@/api/types';
import { AppAvatar, AppButton, AppCheckbox, AppFormField, AppInput, AppModal, AppSelect, AppTextarea } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { rules, useForm } from '@/composables/useForm';
import { useToast } from '@/composables/useToast';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ open: boolean; student?: Student | null }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [student: Student] }>();
const { t } = useI18n();
const toast = useToast();

const branches = ref<Branch[]>([]);
onMounted(async () => {
  branches.value = await schedulesApi.branches().catch(() => []);
});

const emptyValues = () => ({
  firstName: '',
  lastName: '',
  middleName: '',
  gender: '' as '' | 'MALE' | 'FEMALE',
  birthDate: '',
  phone: '',
  email: '',
  passportSeries: '',
  passportNumber: '',
  address: '',
  photoUrl: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  status: 'ACTIVE' as Student['status'],
  notes: '',
  branchId: '',
  accountPassword: '',
});

const form = useForm(emptyValues(), {
  firstName: [rules.required(t('validation.required'))],
  lastName: [rules.required(t('validation.required'))],
  phone: [rules.required(t('validation.required')), rules.phone(t('validation.phone'))],
  email: [rules.email(t('validation.email'))],
  accountPassword: [rules.minLength(8, t('validation.minLength', { n: 8 }))],
});

const parents = ref<ParentPayload[]>([]);
const uploading = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const student = props.student;
    form.reset(
      student
        ? {
            firstName: student.firstName,
            lastName: student.lastName,
            middleName: student.middleName ?? '',
            gender: student.gender ?? '',
            birthDate: student.birthDate ?? '',
            phone: student.phone,
            email: student.email ?? '',
            passportSeries: student.passportSeries ?? '',
            passportNumber: student.passportNumber ?? '',
            address: student.address ?? '',
            photoUrl: student.photoUrl ?? '',
            emergencyContactName: student.emergencyContactName ?? '',
            emergencyContactPhone: student.emergencyContactPhone ?? '',
            status: student.status,
            notes: student.notes ?? '',
            branchId: student.branchId ?? '',
            accountPassword: '',
          }
        : emptyValues(),
    );
    parents.value = (student?.parents ?? []).map((parent) => ({ fullName: parent.fullName, phone: parent.phone, relation: parent.relation, isPrimary: parent.isPrimary }));
  },
  { immediate: true },
);

const addParent = (): void => {
  parents.value.push({ fullName: '', phone: '', relation: 'PARENT', isPrimary: parents.value.length === 0 });
};

const removeParent = (index: number): void => {
  parents.value.splice(index, 1);
};

const onPhoto = async (event: Event): Promise<void> => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    const stored = await filesApi.upload(file, 'students');
    form.values.photoUrl = stored.url;
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  } finally {
    uploading.value = false;
  }
};

const clean = (value: string): string | undefined => (value.trim() === '' ? undefined : value.trim());

const save = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    const payload: StudentPayload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      middleName: clean(values.middleName),
      gender: values.gender || undefined,
      birthDate: clean(values.birthDate),
      phone: values.phone.trim(),
      email: clean(values.email),
      passportSeries: clean(values.passportSeries),
      passportNumber: clean(values.passportNumber),
      address: clean(values.address),
      photoUrl: clean(values.photoUrl),
      emergencyContactName: clean(values.emergencyContactName),
      emergencyContactPhone: clean(values.emergencyContactPhone),
      status: values.status,
      notes: clean(values.notes),
      branchId: clean(values.branchId),
      parents: parents.value.filter((parent) => parent.fullName.trim() && parent.phone.trim()),
      accountPassword: clean(values.accountPassword),
    };
    const saved = props.student ? await studentsApi.update(props.student.id, payload) : await studentsApi.create(payload);
    toast.success(props.student ? t('common.updated') : t('common.created'));
    emit('saved', saved);
    emit('update:open', false);
  });
  if (!ok && form.serverError.value) {
    toast.error(t('common.errorTitle'), form.serverError.value);
  }
};

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'DROPPED'].map((status) => ({ value: status, label: t(`status.${status}`) }));
const GENDER_OPTIONS = ['MALE', 'FEMALE'].map((gender) => ({ value: gender, label: t(`status.${gender}`) }));
const RELATION_OPTIONS = ['FATHER', 'MOTHER', 'PARENT', 'GUARDIAN', 'OTHER'].map((relation) => ({ value: relation, label: t(`students.relations.${relation}`) }));
</script>

<template>
  <AppModal :open="open" :title="student ? t('students.edit') : t('students.add')" size="lg" @update:open="emit('update:open', $event)">
    <form class="form-grid" novalidate @submit.prevent="save">
      <div class="span-2 photo">
        <AppAvatar :src="form.values.photoUrl || null" :name="`${form.values.firstName} ${form.values.lastName}`" :size="64" />
        <label class="photo__upload">
          <input type="file" accept="image/*" hidden @change="onPhoto" />
          <AppButton variant="outline" size="sm" icon="upload" :loading="uploading" type="button" @click="($event.currentTarget as HTMLElement).closest('label')?.querySelector('input')?.click()">
            {{ t('students.uploadPhoto') }}
          </AppButton>
        </label>
      </div>
      <AppFormField :label="t('students.lastName')" :error="form.errors.lastName" required><AppInput v-model="form.values.lastName" :invalid="!!form.errors.lastName" /></AppFormField>
      <AppFormField :label="t('students.firstName')" :error="form.errors.firstName" required><AppInput v-model="form.values.firstName" :invalid="!!form.errors.firstName" /></AppFormField>
      <AppFormField :label="t('students.middleName')"><AppInput v-model="form.values.middleName" /></AppFormField>
      <AppFormField :label="t('students.gender')"><AppSelect v-model="form.values.gender" :options="GENDER_OPTIONS" :placeholder="t('common.select')" /></AppFormField>
      <AppFormField :label="t('students.birthDate')"><AppInput v-model="form.values.birthDate" type="date" /></AppFormField>
      <AppFormField :label="t('common.status')"><AppSelect v-model="form.values.status" :options="STATUS_OPTIONS" :clearable="false" /></AppFormField>
      <AppFormField :label="t('common.phone')" :error="form.errors.phone" required><AppInput v-model="form.values.phone" placeholder="+998901234567" :invalid="!!form.errors.phone" /></AppFormField>
      <AppFormField :label="t('common.email')" :error="form.errors.email"><AppInput v-model="form.values.email" type="email" :invalid="!!form.errors.email" /></AppFormField>
      <AppFormField :label="t('students.passportSeries')"><AppInput v-model="form.values.passportSeries" placeholder="AA" /></AppFormField>
      <AppFormField :label="t('students.passportNumber')"><AppInput v-model="form.values.passportNumber" placeholder="1234567" /></AppFormField>
      <AppFormField :label="t('common.address')" class="span-2"><AppInput v-model="form.values.address" /></AppFormField>
      <AppFormField :label="t('students.emergencyName')"><AppInput v-model="form.values.emergencyContactName" /></AppFormField>
      <AppFormField :label="t('students.emergencyPhone')"><AppInput v-model="form.values.emergencyContactPhone" /></AppFormField>
      <AppFormField :label="t('students.branch')">
        <AppSelect v-model="form.values.branchId" :options="branches.map((branch) => ({ value: branch.id, label: branch.name }))" :placeholder="t('common.select')" />
      </AppFormField>
      <AppFormField :label="t('students.accountPassword')" :error="form.errors.accountPassword" :hint="t('students.accountHint')">
        <AppInput v-model="form.values.accountPassword" type="password" autocomplete="new-password" :invalid="!!form.errors.accountPassword" />
      </AppFormField>
      <AppFormField :label="t('common.notes')" class="span-2"><AppTextarea v-model="form.values.notes" :rows="2" /></AppFormField>
      <div class="span-2 parents">
        <div class="flex items-center justify-between mb-4">
          <h3>{{ t('students.parents') }}</h3>
          <AppButton variant="outline" size="sm" icon="plus" type="button" @click="addParent">{{ t('students.addParent') }}</AppButton>
        </div>
        <div v-for="(parent, index) in parents" :key="index" class="parents__row">
          <AppInput v-model="parent.fullName" :placeholder="t('students.parentName')" />
          <AppInput v-model="parent.phone" :placeholder="t('common.phone')" />
          <AppSelect v-model="parent.relation" :options="RELATION_OPTIONS" :clearable="false" />
          <AppCheckbox :model-value="parent.isPrimary ?? false" :label="t('students.isPrimary')" @update:model-value="parent.isPrimary = $event" />
          <AppButton variant="ghost" size="sm" icon="trash" icon-only type="button" @click="removeParent(index)" />
        </div>
      </div>
    </form>
    <template #footer>
      <AppButton variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="form.submitting.value" @click="save">{{ t('common.save') }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.photo {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.parents {
  border-top: 1px solid $color-border;
  padding-top: $space-4;

  &__row {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1.2fr auto auto;
    gap: $space-2;
    align-items: center;
    margin-bottom: $space-2;

    @include down($bp-md) {
      grid-template-columns: 1fr 1fr;
    }
  }
}
</style>
