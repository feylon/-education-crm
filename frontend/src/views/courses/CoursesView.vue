<script setup lang="ts">
import { coursesApi, type CategoryPayload, type CoursePayload } from '@/api/courses.api';
import type { Course, CourseCategory } from '@/api/types';
import { AppButton, AppCard, AppFormField, AppInput, AppModal, AppPageHeader, AppPagination, AppSelect, AppTable, AppTextarea, StatusBadge, type TableColumn } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { useConfirm } from '@/composables/useConfirm';
import { rules, useForm } from '@/composables/useForm';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();
const { money } = useFormatters();

const categories = ref<CourseCategory[]>([]);
const loadCategories = async (): Promise<void> => {
  categories.value = await coursesApi.categories();
};
onMounted(loadCategories);

const list = usePagination<Course, { status?: string; categoryId?: string }>((query) => coursesApi.list(query), { sortBy: 'name', sortOrder: 'ASC' });

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('common.name'), sortable: true },
  { key: 'category', label: t('courses.category'), hideBelow: 'md' },
  { key: 'durationMonths', label: t('courses.duration'), sortable: true, hideBelow: 'lg', align: 'center' },
  { key: 'price', label: t('courses.price'), sortable: true, align: 'right' },
  { key: 'groupsCount', label: t('courses.groupsCount'), align: 'center', hideBelow: 'md' },
  { key: 'status', label: t('common.status'), sortable: true },
  { key: 'actions', label: '', width: '90px', align: 'right' },
]);
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'].map((status) => ({ value: status, label: t(`status.${status}`) }));
const categoryOptions = computed(() => categories.value.map((category) => ({ value: category.id, label: category.name })));

const courseOpen = ref(false);
const editingCourse = ref<Course | null>(null);
const courseForm = useForm(
  { name: '', description: '', categoryId: '', durationMonths: 3 as number | string, price: '' as number | string, status: 'ACTIVE' as Course['status'], color: '#2563eb' },
  {
    name: [rules.required(t('validation.required'))],
    price: [rules.required(t('validation.required')), rules.min(0, t('validation.min', { n: 0 }))],
    durationMonths: [rules.required(t('validation.required')), rules.min(1, t('validation.min', { n: 1 }))],
  },
);

const openCourse = (course: Course | null): void => {
  editingCourse.value = course;
  courseForm.reset(
    course
      ? { name: course.name, description: course.description ?? '', categoryId: course.categoryId ?? '', durationMonths: course.durationMonths, price: course.price, status: course.status, color: course.color ?? '#2563eb' }
      : undefined,
  );
  courseOpen.value = true;
};

const saveCourse = async (): Promise<void> => {
  const ok = await courseForm.submit(async (values) => {
    const payload: CoursePayload = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      categoryId: values.categoryId || undefined,
      durationMonths: Number(values.durationMonths),
      price: Number(values.price),
      status: values.status,
      color: values.color || undefined,
    };
    if (editingCourse.value) await coursesApi.update(editingCourse.value.id, payload);
    else await coursesApi.create(payload);
    toast.success(t('common.saved'));
  });
  if (ok) {
    courseOpen.value = false;
    await Promise.all([list.reload(), loadCategories()]);
  } else if (courseForm.serverError.value) toast.error(t('common.errorTitle'), courseForm.serverError.value);
};

const removeCourse = async (course: Course): Promise<void> => {
  if (!(await confirm({ title: t('common.confirmDeleteTitle'), message: t('courses.deleteConfirm', { name: course.name }), danger: true, confirmText: t('common.delete') }))) return;
  try {
    await coursesApi.remove(course.id);
    toast.success(t('common.deleted'));
    await Promise.all([list.reload(), loadCategories()]);
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};

const categoryOpen = ref(false);
const editingCategory = ref<CourseCategory | null>(null);
const categoryForm = useForm({ name: '', description: '' }, { name: [rules.required(t('validation.required'))] });
const openCategory = (category: CourseCategory | null): void => {
  editingCategory.value = category;
  categoryForm.reset(category ? { name: category.name, description: category.description ?? '' } : undefined);
  categoryOpen.value = true;
};
const saveCategory = async (): Promise<void> => {
  const ok = await categoryForm.submit(async (values) => {
    const payload: CategoryPayload = { name: values.name.trim(), description: values.description.trim() || undefined };
    if (editingCategory.value) await coursesApi.updateCategory(editingCategory.value.id, payload);
    else await coursesApi.createCategory(payload);
    toast.success(t('common.saved'));
  });
  if (ok) {
    categoryOpen.value = false;
    await loadCategories();
  } else if (categoryForm.serverError.value) toast.error(t('common.errorTitle'), categoryForm.serverError.value);
};
const removeCategory = async (category: CourseCategory): Promise<void> => {
  if (!(await confirm({ title: t('common.confirmDeleteTitle'), message: category.name, danger: true, confirmText: t('common.delete') }))) return;
  try {
    await coursesApi.removeCategory(category.id);
    toast.success(t('common.deleted'));
    await loadCategories();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('courses.title')" :subtitle="t('courses.subtitle')">
      <template #actions>
        <AppButton v-if="can('courses.create')" variant="outline" icon="plus" @click="openCategory(null)">{{ t('courses.addCategory') }}</AppButton>
        <AppButton v-if="can('courses.create')" icon="plus" @click="openCourse(null)">{{ t('courses.add') }}</AppButton>
      </template>
    </AppPageHeader>
    <div class="layout">
      <AppCard flush class="layout__main">
        <div class="toolbar" style="padding: 16px 20px">
          <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
          <AppSelect v-model="list.filters.categoryId" :options="categoryOptions" :placeholder="t('courses.category')" style="width: 200px" />
          <AppSelect v-model="list.filters.status" :options="STATUS_OPTIONS" :placeholder="t('common.status')" style="width: 160px" />
        </div>
        <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" @sort="list.toggleSort" @retry="list.reload">
          <template #cell-name="{ row }">
            <div class="flex items-center gap-3">
              <span class="color-dot" :style="{ background: row.color ?? '#2563eb' }" />
              <div>
                <p class="fw-600">{{ row.name }}</p>
                <p v-if="row.description" class="text-muted" style="font-size: 12px; max-width: 320px" :title="row.description">{{ row.description }}</p>
              </div>
            </div>
          </template>
          <template #cell-category="{ row }">{{ row.category?.name ?? t('courses.noCategory') }}</template>
          <template #cell-durationMonths="{ value }">{{ t('courses.months', { n: value }) }}</template>
          <template #cell-price="{ value }"><span class="mono fw-600">{{ money(value) }}</span></template>
          <template #cell-groupsCount="{ value }">{{ value ?? 0 }}</template>
          <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
          <template #cell-actions="{ row }">
            <div class="flex gap-1" style="justify-content: flex-end">
              <AppButton v-if="can('courses.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openCourse(row)" />
              <AppButton v-if="can('courses.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="removeCourse(row)" />
            </div>
          </template>
        </AppTable>
        <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
      </AppCard>
      <AppCard :title="t('courses.categories')" flush class="layout__side">
        <ul class="cats">
          <li v-for="category in categories" :key="category.id" class="cats__item">
            <div>
              <p class="fw-600">{{ category.name }}</p>
              <p class="text-muted" style="font-size: 12px">{{ t('courses.coursesCount', { n: category.coursesCount ?? 0 }) }}</p>
            </div>
            <div class="flex gap-1">
              <AppButton v-if="can('courses.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openCategory(category)" />
              <AppButton v-if="can('courses.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="removeCategory(category)" />
            </div>
          </li>
          <li v-if="categories.length === 0" class="cats__item text-muted">{{ t('common.none') }}</li>
        </ul>
      </AppCard>
    </div>

    <AppModal v-model:open="courseOpen" :title="editingCourse ? t('courses.edit') : t('courses.add')">
      <form class="form-grid" novalidate @submit.prevent="saveCourse">
        <AppFormField :label="t('common.name')" :error="courseForm.errors.name" required class="span-2"><AppInput v-model="courseForm.values.name" :invalid="!!courseForm.errors.name" /></AppFormField>
        <AppFormField :label="t('courses.category')"><AppSelect v-model="courseForm.values.categoryId" :options="categoryOptions" :placeholder="t('courses.noCategory')" /></AppFormField>
        <AppFormField :label="t('common.status')"><AppSelect v-model="courseForm.values.status" :options="STATUS_OPTIONS" :clearable="false" /></AppFormField>
        <AppFormField :label="t('courses.price')" :error="courseForm.errors.price" required><AppInput v-model="courseForm.values.price" type="number" min="0" :invalid="!!courseForm.errors.price" /></AppFormField>
        <AppFormField :label="t('courses.duration')" :error="courseForm.errors.durationMonths" required><AppInput v-model="courseForm.values.durationMonths" type="number" min="1" max="60" /></AppFormField>
        <AppFormField :label="t('courses.color')"><input v-model="courseForm.values.color" type="color" class="color-input" /></AppFormField>
        <AppFormField :label="t('common.description')" class="span-2"><AppTextarea v-model="courseForm.values.description" /></AppFormField>
      </form>
      <template #footer>
        <AppButton variant="outline" @click="courseOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="courseForm.submitting.value" @click="saveCourse">{{ t('common.save') }}</AppButton>
      </template>
    </AppModal>

    <AppModal v-model:open="categoryOpen" :title="editingCategory ? t('courses.editCategory') : t('courses.addCategory')" size="sm">
      <div class="flex-col">
        <AppFormField :label="t('common.name')" :error="categoryForm.errors.name" required><AppInput v-model="categoryForm.values.name" :invalid="!!categoryForm.errors.name" /></AppFormField>
        <AppFormField :label="t('common.description')"><AppTextarea v-model="categoryForm.values.description" :rows="2" /></AppFormField>
      </div>
      <template #footer>
        <AppButton variant="outline" @click="categoryOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="categoryForm.submitting.value" @click="saveCategory">{{ t('common.save') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: $space-4;
  align-items: start;

  @include down($bp-lg) {
    grid-template-columns: 1fr;
  }
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.color-input {
  width: 60px;
  height: 38px;
  border: 1px solid $color-border-strong;
  border-radius: $radius-md;
  padding: 2px;
  background: $color-surface;
}

.cats {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px $space-5;
    border-top: 1px solid $color-border;
  }
}

.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
</style>
