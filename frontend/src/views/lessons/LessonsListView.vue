<script setup lang="ts">
import { attendanceApi } from '@/api/attendance.api';
import { groupsApi } from '@/api/groups.api';
import type { Group, Lesson } from '@/api/types';
import { AppBadge, AppButton, AppCard, AppFormField, AppInput, AppModal, AppPageHeader, AppPagination, AppSearchSelect, AppSelect, AppTable, StatusBadge, type TableColumn } from '@/components/ui';
import { rules, useForm } from '@/composables/useForm';
import { addDaysIso, todayIso, useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { can } = usePermissions();
const { date, time } = useFormatters();

const list = usePagination<Lesson, { groupId?: string | null; status?: string; from?: string; to?: string }>((query) => attendanceApi.lessons(query), {
  sortBy: 'date',
  sortOrder: 'DESC',
  filters: { groupId: null, status: undefined, from: addDaysIso(todayIso(), -14), to: addDaysIso(todayIso(), 14) },
});

const columns = computed<TableColumn[]>(() => [
  { key: 'date', label: t('lessons.date'), sortable: true },
  { key: 'group', label: t('lessons.group') },
  { key: 'teacher', label: t('lessons.teacher'), hideBelow: 'lg' },
  { key: 'room', label: t('lessons.room'), hideBelow: 'lg' },
  { key: 'topic', label: t('lessons.topic'), hideBelow: 'md' },
  { key: 'marked', label: t('lessons.attendance'), align: 'center', hideBelow: 'md' },
  { key: 'status', label: t('common.status'), sortable: true },
  { key: 'actions', label: '', width: '150px', align: 'right' },
]);
const STATUS_OPTIONS = ['PLANNED', 'COMPLETED', 'CANCELLED'].map((status) => ({ value: status, label: t(`status.${status}`) }));
const fetchGroups = (search: string): Promise<Group[]> => groupsApi.lookup(search);
const openAttendance = (lesson: Lesson): void => void router.push({ name: 'lesson-attendance', params: { id: lesson.id } });

const generateOpen = ref(false);
const generateForm = useForm(
  { groupId: null as string | null, from: todayIso(), to: addDaysIso(todayIso(), 30) },
  { from: [rules.required(t('validation.required'))], to: [rules.required(t('validation.required'))] },
);
const generate = async (): Promise<void> => {
  const ok = await generateForm.submit(async (values) => {
    const result = await attendanceApi.generate({ from: values.from, to: values.to, groupId: values.groupId ?? undefined });
    toast.success(t('lessons.generated', { created: result.created, skipped: result.skipped }));
  });
  if (ok) {
    generateOpen.value = false;
    await list.reload();
  } else if (generateForm.serverError.value) toast.error(t('common.errorTitle'), generateForm.serverError.value);
};

const createOpen = ref(false);
const createForm = useForm(
  { groupId: null as string | null, date: todayIso(), startTime: '09:00', endTime: '10:30', topic: '' },
  {
    groupId: [rules.required(t('validation.required'))],
    date: [rules.required(t('validation.required'))],
    startTime: [rules.required(t('validation.required')), rules.time(t('validation.time'))],
    endTime: [rules.required(t('validation.required')), rules.time(t('validation.time'))],
  },
);
const createLesson = async (): Promise<void> => {
  const ok = await createForm.submit(async (values) => {
    await attendanceApi.createLesson({ groupId: values.groupId as string, date: values.date, startTime: values.startTime, endTime: values.endTime, topic: values.topic.trim() || undefined });
    toast.success(t('common.created'));
  });
  if (ok) {
    createOpen.value = false;
    await list.reload();
  } else if (createForm.serverError.value) toast.error(t('common.errorTitle'), createForm.serverError.value);
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('lessons.title')" :subtitle="t('lessons.subtitle')">
      <template #actions>
        <AppButton v-if="can('lessons.create')" variant="outline" icon="refresh" @click="generateOpen = true">{{ t('lessons.generate') }}</AppButton>
        <AppButton v-if="can('lessons.create')" icon="plus" @click="createOpen = true">{{ t('lessons.add') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow" style="max-width: 260px">
          <AppSearchSelect v-model="list.filters.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :placeholder="t('lessons.allGroups')" />
        </div>
        <AppSelect v-model="list.filters.status" :options="STATUS_OPTIONS" :placeholder="t('common.status')" style="width: 170px" />
        <AppInput v-model="list.filters.from" type="date" style="width: 160px" />
        <AppInput v-model="list.filters.to" type="date" style="width: 160px" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" clickable @sort="list.toggleSort" @row-click="openAttendance" @retry="list.reload">
        <template #cell-date="{ row }"><span class="fw-600">{{ date(row.date) }}</span><p class="text-muted mono" style="font-size: 12px">{{ time(row.startTime) }}–{{ time(row.endTime) }}</p></template>
        <template #cell-group="{ row }"><span class="fw-600">{{ row.group?.name }}</span><p class="text-muted" style="font-size: 12px">{{ row.group?.course?.name }}</p></template>
        <template #cell-teacher="{ row }">{{ row.teacher ? `${row.teacher.lastName} ${row.teacher.firstName}` : '—' }}</template>
        <template #cell-room="{ row }">{{ row.room?.name ?? '—' }}</template>
        <template #cell-topic="{ value }">{{ value ?? '—' }}</template>
        <template #cell-marked="{ row }"><AppBadge :variant="row.markedCount ? 'success' : 'neutral'" size="sm">{{ row.markedCount ? t('lessons.marked') : t('lessons.notMarked') }}</AppBadge></template>
        <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        <template #cell-actions="{ row }">
          <AppButton size="sm" :variant="row.markedCount ? 'outline' : 'secondary'" @click.stop="openAttendance(row)">{{ row.markedCount ? t('common.view') : t('lessons.markAttendance') }}</AppButton>
        </template>
      </AppTable>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>

    <AppModal v-model:open="generateOpen" :title="t('lessons.generateTitle')" size="sm">
      <p class="text-muted mb-4">{{ t('lessons.generateHint') }}</p>
      <div class="flex-col">
        <AppFormField :label="t('lessons.group')"><AppSearchSelect v-model="generateForm.values.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :placeholder="t('lessons.allGroups')" /></AppFormField>
        <AppFormField :label="t('common.from')" :error="generateForm.errors.from" required><AppInput v-model="generateForm.values.from" type="date" /></AppFormField>
        <AppFormField :label="t('common.to')" :error="generateForm.errors.to" required><AppInput v-model="generateForm.values.to" type="date" /></AppFormField>
      </div>
      <template #footer>
        <AppButton variant="outline" @click="generateOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="generateForm.submitting.value" @click="generate">{{ t('lessons.generate') }}</AppButton>
      </template>
    </AppModal>

    <AppModal v-model:open="createOpen" :title="t('lessons.add')" size="sm">
      <div class="flex-col">
        <AppFormField :label="t('lessons.group')" :error="createForm.errors.groupId" required><AppSearchSelect v-model="createForm.values.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :invalid="!!createForm.errors.groupId" /></AppFormField>
        <AppFormField :label="t('lessons.date')" :error="createForm.errors.date" required><AppInput v-model="createForm.values.date" type="date" /></AppFormField>
        <div class="grid grid-2">
          <AppFormField :label="t('schedule.startTime')" :error="createForm.errors.startTime" required><AppInput v-model="createForm.values.startTime" type="time" /></AppFormField>
          <AppFormField :label="t('schedule.endTime')" :error="createForm.errors.endTime" required><AppInput v-model="createForm.values.endTime" type="time" /></AppFormField>
        </div>
        <AppFormField :label="t('lessons.topic')"><AppInput v-model="createForm.values.topic" /></AppFormField>
      </div>
      <template #footer>
        <AppButton variant="outline" @click="createOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="createForm.submitting.value" @click="createLesson">{{ t('common.create') }}</AppButton>
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
