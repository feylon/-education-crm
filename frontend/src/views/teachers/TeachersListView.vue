<script setup lang="ts">
import { teachersApi } from '@/api/teachers.api';
import type { Teacher } from '@/api/types';
import { AppAvatar, AppButton, AppCard, AppInput, AppPageHeader, AppPagination, AppSelect, AppTable, StatusBadge, type TableColumn } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { useConfirm } from '@/composables/useConfirm';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import TeacherFormModal from './TeacherFormModal.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();
const { money, date } = useFormatters();

const list = usePagination<Teacher, { status?: string }>((query) => teachersApi.list(query), { sortBy: 'lastName', sortOrder: 'ASC' });

const columns = computed<TableColumn[]>(() => [
  { key: 'lastName', label: t('common.name'), sortable: true },
  { key: 'specialization', label: t('teachers.specialization'), sortable: true, hideBelow: 'md' },
  { key: 'phone', label: t('common.phone'), hideBelow: 'lg' },
  { key: 'groupsCount', label: t('teachers.activeGroups'), align: 'center', hideBelow: 'md' },
  { key: 'salary', label: t('teachers.salary'), align: 'right', hideBelow: 'lg' },
  { key: 'hireDate', label: t('teachers.hireDate'), sortable: true, hideBelow: 'lg' },
  { key: 'status', label: t('common.status'), sortable: true },
  { key: 'actions', label: '', width: '90px', align: 'right' },
]);
const STATUS_OPTIONS = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'].map((status) => ({ value: status, label: t(`status.${status}`) }));

const formOpen = ref(false);
const editing = ref<Teacher | null>(null);
const openCreate = (): void => {
  editing.value = null;
  formOpen.value = true;
};
const openEdit = (teacher: Teacher): void => {
  editing.value = teacher;
  formOpen.value = true;
};
const openDetail = (teacher: Teacher): void => void router.push({ name: 'teacher-detail', params: { id: teacher.id } });

const remove = async (teacher: Teacher): Promise<void> => {
  const ok = await confirm({ title: t('common.confirmDeleteTitle'), message: t('teachers.deleteConfirm', { name: `${teacher.lastName} ${teacher.firstName}` }), danger: true, confirmText: t('common.delete') });
  if (!ok) return;
  try {
    await teachersApi.remove(teacher.id);
    toast.success(t('common.deleted'));
    await list.reload();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};

const salaryLabel = (teacher: Teacher): string =>
  teacher.salaryType === 'PERCENT' ? `${teacher.salaryAmount}%` : money(teacher.salaryAmount);
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('teachers.title')" :subtitle="t('teachers.subtitle')">
      <template #actions>
        <AppButton v-if="can('teachers.create')" icon="plus" @click="openCreate">{{ t('teachers.add') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <AppSelect v-model="list.filters.status" :options="STATUS_OPTIONS" :placeholder="t('common.status')" style="width: 180px" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" clickable @sort="list.toggleSort" @row-click="openDetail" @retry="list.reload">
        <template #cell-lastName="{ row }">
          <div class="flex items-center gap-3">
            <AppAvatar :src="row.photoUrl" :name="`${row.firstName} ${row.lastName}`" :size="34" />
            <div>
              <p class="fw-600">{{ row.lastName }} {{ row.firstName }}</p>
              <p class="text-muted" style="font-size: 12px">{{ row.user?.email }}</p>
            </div>
          </div>
        </template>
        <template #cell-specialization="{ value }">{{ value ?? '—' }}</template>
        <template #cell-groupsCount="{ value }">{{ value ?? 0 }}</template>
        <template #cell-salary="{ row }"><span class="mono">{{ salaryLabel(row) }}</span></template>
        <template #cell-hireDate="{ value }">{{ date(value) }}</template>
        <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1" style="justify-content: flex-end" @click.stop>
            <AppButton v-if="can('teachers.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openEdit(row)" />
            <AppButton v-if="can('teachers.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="remove(row)" />
          </div>
        </template>
      </AppTable>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <TeacherFormModal v-model:open="formOpen" :teacher="editing" @saved="list.reload()" />
  </div>
</template>
