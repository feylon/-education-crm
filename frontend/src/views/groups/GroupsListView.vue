<script setup lang="ts">
import { coursesApi } from '@/api/courses.api';
import { groupsApi } from '@/api/groups.api';
import type { Course, Group } from '@/api/types';
import { AppButton, AppCard, AppInput, AppPageHeader, AppPagination, AppSelect, AppTable, StatusBadge, type TableColumn } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { useConfirm } from '@/composables/useConfirm';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import GroupFormModal from './GroupFormModal.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();
const { money, date, fullName } = useFormatters();

const courses = ref<Course[]>([]);
onMounted(async () => {
  courses.value = await coursesApi.list({ limit: 100 }).then((result) => result.items).catch(() => []);
});

const list = usePagination<Group, { status?: string; courseId?: string }>((query) => groupsApi.list(query), { sortBy: 'name', sortOrder: 'ASC' });
const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('common.name'), sortable: true },
  { key: 'teacher', label: t('groups.teacher'), hideBelow: 'md' },
  { key: 'students', label: t('groups.students'), align: 'center' },
  { key: 'room', label: t('groups.room'), hideBelow: 'lg' },
  { key: 'startDate', label: t('groups.startDate'), sortable: true, hideBelow: 'lg' },
  { key: 'monthlyFee', label: t('groups.monthlyFee'), sortable: true, align: 'right', hideBelow: 'md' },
  { key: 'status', label: t('common.status'), sortable: true },
  { key: 'actions', label: '', width: '90px', align: 'right' },
]);
const STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].map((status) => ({ value: status, label: t(`status.${status}`) }));

const formOpen = ref(false);
const editing = ref<Group | null>(null);
const openCreate = (): void => {
  editing.value = null;
  formOpen.value = true;
};
const openEdit = (group: Group): void => {
  editing.value = group;
  formOpen.value = true;
};
const openDetail = (group: Group): void => void router.push({ name: 'group-detail', params: { id: group.id } });
const remove = async (group: Group): Promise<void> => {
  if (!(await confirm({ title: t('common.confirmDeleteTitle'), message: t('groups.deleteConfirm', { name: group.name }), danger: true, confirmText: t('common.delete') }))) return;
  try {
    await groupsApi.remove(group.id);
    toast.success(t('common.deleted'));
    await list.reload();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('groups.title')" :subtitle="t('groups.subtitle')">
      <template #actions>
        <AppButton v-if="can('groups.create')" icon="plus" @click="openCreate">{{ t('groups.add') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <AppSelect v-model="list.filters.courseId" :options="courses.map((course) => ({ value: course.id, label: course.name }))" :placeholder="t('groups.course')" style="width: 200px" />
        <AppSelect v-model="list.filters.status" :options="STATUS_OPTIONS" :placeholder="t('common.status')" style="width: 170px" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" clickable @sort="list.toggleSort" @row-click="openDetail" @retry="list.reload">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-3">
            <span class="color-dot" :style="{ background: row.course?.color ?? '#2563eb' }" />
            <div>
              <p class="fw-600">{{ row.name }}</p>
              <p class="text-muted" style="font-size: 12px">{{ row.course?.name }}</p>
            </div>
          </div>
        </template>
        <template #cell-teacher="{ row }">{{ row.teacher ? fullName(row.teacher) : t('groups.noTeacher') }}</template>
        <template #cell-students="{ row }"><span class="mono">{{ t('groups.studentsCount', { n: row.studentsCount ?? 0, capacity: row.capacity }) }}</span></template>
        <template #cell-room="{ row }">{{ row.room?.name ?? '—' }}</template>
        <template #cell-startDate="{ value }">{{ date(value) }}</template>
        <template #cell-monthlyFee="{ value }"><span class="mono">{{ money(value) }}</span></template>
        <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1" style="justify-content: flex-end" @click.stop>
            <AppButton v-if="can('groups.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openEdit(row)" />
            <AppButton v-if="can('groups.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="remove(row)" />
          </div>
        </template>
      </AppTable>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <GroupFormModal v-model:open="formOpen" :group="editing" @saved="list.reload()" />
  </div>
</template>

<style scoped lang="scss">
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
