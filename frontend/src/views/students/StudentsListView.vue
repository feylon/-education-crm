<script setup lang="ts">
import { studentsApi } from '@/api/students.api';
import type { Student } from '@/api/types';
import { AppAvatar, AppBadge, AppButton, AppCard, AppInput, AppPageHeader, AppPagination, AppSelect, AppTable, StatusBadge, type TableColumn } from '@/components/ui';
import { useConfirm } from '@/composables/useConfirm';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { errorMessage } from '@/composables/useAsync';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import StudentFormModal from './StudentFormModal.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();
const { date } = useFormatters();

const list = usePagination<Student, { status?: string; gender?: string }>((query) => studentsApi.list(query), { sortBy: 'createdAt', sortOrder: 'DESC' });

const columns = computed<TableColumn[]>(() => [
  { key: 'lastName', label: t('common.name'), sortable: true },
  { key: 'phone', label: t('common.phone'), sortable: true, hideBelow: 'md' },
  { key: 'groups', label: t('students.groups'), hideBelow: 'lg' },
  { key: 'birthDate', label: t('students.birthDate'), sortable: true, hideBelow: 'lg' },
  { key: 'status', label: t('common.status'), sortable: true },
  { key: 'actions', label: '', width: '90px', align: 'right' },
]);

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'DROPPED'].map((status) => ({ value: status, label: t(`status.${status}`) }));
const GENDER_OPTIONS = ['MALE', 'FEMALE'].map((gender) => ({ value: gender, label: t(`status.${gender}`) }));

const formOpen = ref(false);
const editing = ref<Student | null>(null);

const openCreate = (): void => {
  editing.value = null;
  formOpen.value = true;
};
const openEdit = (student: Student): void => {
  editing.value = student;
  formOpen.value = true;
};
const openDetail = (student: Student): void => void router.push({ name: 'student-detail', params: { id: student.id } });

const remove = async (student: Student): Promise<void> => {
  const ok = await confirm({ title: t('common.confirmDeleteTitle'), message: t('students.deleteConfirm', { name: `${student.lastName} ${student.firstName}` }), danger: true, confirmText: t('common.delete') });
  if (!ok) return;
  try {
    await studentsApi.remove(student.id);
    toast.success(t('common.deleted'));
    await list.reload();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('students.title')" :subtitle="t('students.subtitle')">
      <template #actions>
        <AppButton v-if="can('students.create')" icon="plus" @click="openCreate">{{ t('students.add') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <AppSelect v-model="list.filters.status" :options="STATUS_OPTIONS" :placeholder="t('common.status')" style="width: 180px" />
        <AppSelect v-model="list.filters.gender" :options="GENDER_OPTIONS" :placeholder="t('students.gender')" style="width: 150px" />
        <AppButton variant="ghost" icon="x" @click="list.resetFilters()">{{ t('common.reset') }}</AppButton>
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" clickable @sort="list.toggleSort" @row-click="openDetail" @retry="list.reload">
        <template #cell-lastName="{ row }">
          <div class="flex items-center gap-3">
            <AppAvatar :src="row.photoUrl" :name="`${row.firstName} ${row.lastName}`" :size="34" />
            <div>
              <p class="fw-600">{{ row.lastName }} {{ row.firstName }}</p>
              <p class="text-muted" style="font-size: 12px">{{ row.email ?? row.phone }}</p>
            </div>
          </div>
        </template>
        <template #cell-groups="{ row }">
          <div class="flex gap-1 flex-wrap">
            <AppBadge v-for="enrollment in row.enrollments ?? []" :key="enrollment.id" size="sm" variant="primary">{{ enrollment.group?.name }}</AppBadge>
            <span v-if="!row.enrollments?.length" class="text-soft">—</span>
          </div>
        </template>
        <template #cell-birthDate="{ value }">{{ date(value) }}</template>
        <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1" style="justify-content: flex-end" @click.stop>
            <AppButton v-if="can('students.update')" variant="ghost" size="sm" icon="edit" icon-only :title="t('common.edit')" @click="openEdit(row)" />
            <AppButton v-if="can('students.delete')" variant="ghost" size="sm" icon="trash" icon-only :title="t('common.delete')" @click="remove(row)" />
          </div>
        </template>
      </AppTable>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <StudentFormModal v-model:open="formOpen" :student="editing" @saved="list.reload()" />
  </div>
</template>
