<script setup lang="ts">
import { coursesApi } from '@/api/courses.api';
import { groupsApi, type GroupPayload } from '@/api/groups.api';
import { schedulesApi } from '@/api/schedules.api';
import { teachersApi } from '@/api/teachers.api';
import type { Branch, Course, Group, Room, Teacher } from '@/api/types';
import { AppButton, AppFormField, AppInput, AppModal, AppSearchSelect, AppSelect, AppTextarea } from '@/components/ui';
import { rules, useForm } from '@/composables/useForm';
import { todayIso } from '@/composables/useFormatters';
import { useToast } from '@/composables/useToast';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ open: boolean; group?: Group | null }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [group: Group] }>();
const { t } = useI18n();
const toast = useToast();

const courses = ref<Course[]>([]);
const rooms = ref<Room[]>([]);
const branches = ref<Branch[]>([]);
onMounted(async () => {
  [courses.value, rooms.value, branches.value] = await Promise.all([
    coursesApi.list({ limit: 100, status: 'ACTIVE' }).then((result) => result.items),
    schedulesApi.rooms().catch(() => []),
    schedulesApi.branches().catch(() => []),
  ]);
});

const emptyValues = () => ({
  name: '',
  courseId: '',
  teacherId: '' as string | null,
  roomId: '',
  branchId: '',
  startDate: todayIso(),
  endDate: '',
  monthlyFee: '' as string | number,
  capacity: 12 as string | number,
  status: 'ACTIVE' as Group['status'],
  description: '',
});

const form = useForm(emptyValues(), {
  name: [rules.required(t('validation.required'))],
  courseId: [rules.required(t('validation.required'))],
  startDate: [rules.required(t('validation.required'))],
  capacity: [rules.required(t('validation.required')), rules.min(1, t('validation.min', { n: 1 }))],
});

const teacherLabel = ref('');

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const group = props.group;
    form.reset(
      group
        ? {
            name: group.name,
            courseId: group.courseId,
            teacherId: group.teacherId ?? '',
            roomId: group.roomId ?? '',
            branchId: group.branchId ?? '',
            startDate: group.startDate,
            endDate: group.endDate ?? '',
            monthlyFee: group.monthlyFee,
            capacity: group.capacity,
            status: group.status,
            description: group.description ?? '',
          }
        : emptyValues(),
    );
    teacherLabel.value = group?.teacher ? `${group.teacher.lastName} ${group.teacher.firstName}` : '';
  },
  { immediate: true },
);

const selectedCourse = computed(() => courses.value.find((course) => course.id === form.values.courseId));
const feeHint = computed(() => (selectedCourse.value ? `${t('groups.feeHint')} (${selectedCourse.value.price})` : t('groups.feeHint')));

const save = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    const payload: GroupPayload = {
      name: values.name.trim(),
      courseId: values.courseId,
      teacherId: values.teacherId || undefined,
      roomId: values.roomId || undefined,
      branchId: values.branchId || undefined,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      monthlyFee: values.monthlyFee === '' ? undefined : Number(values.monthlyFee),
      capacity: Number(values.capacity),
      status: values.status,
      description: values.description.trim() || undefined,
    };
    const saved = props.group ? await groupsApi.update(props.group.id, payload) : await groupsApi.create(payload);
    toast.success(props.group ? t('common.updated') : t('common.created'));
    emit('saved', saved);
    emit('update:open', false);
  });
  if (!ok && form.serverError.value) toast.error(t('common.errorTitle'), form.serverError.value);
};

const STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].map((status) => ({ value: status, label: t(`status.${status}`) }));
const fetchTeachers = (search: string): Promise<Teacher[]> => teachersApi.lookup(search);
</script>

<template>
  <AppModal :open="open" :title="group ? t('groups.edit') : t('groups.add')" size="lg" @update:open="emit('update:open', $event)">
    <form class="form-grid" novalidate @submit.prevent="save">
      <AppFormField :label="t('common.name')" :error="form.errors.name" required><AppInput v-model="form.values.name" placeholder="ENG-B1" :invalid="!!form.errors.name" /></AppFormField>
      <AppFormField :label="t('groups.course')" :error="form.errors.courseId" required>
        <AppSelect v-model="form.values.courseId" :options="courses.map((course) => ({ value: course.id, label: `${course.name} · ${course.price}` }))" :placeholder="t('common.select')" :invalid="!!form.errors.courseId" />
      </AppFormField>
      <AppFormField :label="t('groups.teacher')">
        <AppSearchSelect v-model="form.values.teacherId" :fetcher="fetchTeachers" :label-of="(item: Teacher) => `${item.lastName} ${item.firstName}`" :hint-of="(item: Teacher) => item.specialization ?? ''" :initial-label="teacherLabel" :placeholder="t('groups.noTeacher')" />
      </AppFormField>
      <AppFormField :label="t('groups.room')">
        <AppSelect v-model="form.values.roomId" :options="rooms.map((room) => ({ value: room.id, label: `${room.name} (${room.branch?.name ?? ''})` }))" :placeholder="t('groups.noRoom')" />
      </AppFormField>
      <AppFormField :label="t('groups.startDate')" :error="form.errors.startDate" required><AppInput v-model="form.values.startDate" type="date" :invalid="!!form.errors.startDate" /></AppFormField>
      <AppFormField :label="t('groups.endDate')"><AppInput v-model="form.values.endDate" type="date" /></AppFormField>
      <AppFormField :label="t('groups.monthlyFee')" :hint="feeHint"><AppInput v-model="form.values.monthlyFee" type="number" min="0" /></AppFormField>
      <AppFormField :label="t('groups.capacity')" :error="form.errors.capacity" required><AppInput v-model="form.values.capacity" type="number" min="1" max="200" /></AppFormField>
      <AppFormField :label="t('common.status')"><AppSelect v-model="form.values.status" :options="STATUS_OPTIONS" :clearable="false" /></AppFormField>
      <AppFormField :label="t('groups.branch')">
        <AppSelect v-model="form.values.branchId" :options="branches.map((branch) => ({ value: branch.id, label: branch.name }))" :placeholder="t('common.select')" />
      </AppFormField>
      <AppFormField :label="t('common.description')" class="span-2"><AppTextarea v-model="form.values.description" :rows="2" /></AppFormField>
    </form>
    <template #footer>
      <AppButton variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="form.submitting.value" @click="save">{{ t('common.save') }}</AppButton>
    </template>
  </AppModal>
</template>
