<script setup lang="ts">
import { usersApi, type UserPayload } from '@/api/users.api';
import type { Role, User } from '@/api/types';
import { AppAvatar, AppBadge, AppButton, AppCard, AppCheckbox, AppFormField, AppInput, AppModal, AppPageHeader, AppPagination, AppSelect, AppSwitch, AppTable, type TableColumn } from '@/components/ui';
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
const { dateTime } = useFormatters();

const roles = ref<Role[]>([]);
onMounted(async () => {
  roles.value = await usersApi.roles().catch(() => []);
});

const list = usePagination<User, { role?: string; isActive?: boolean }>((query) => usersApi.list(query), { sortBy: 'createdAt', sortOrder: 'DESC' });
const columns = computed<TableColumn[]>(() => [
  { key: 'lastName', label: t('common.name'), sortable: true },
  { key: 'roles', label: t('users.roles') },
  { key: 'phone', label: t('common.phone'), hideBelow: 'lg' },
  { key: 'lastLoginAt', label: t('users.lastLogin'), sortable: true, hideBelow: 'md' },
  { key: 'isActive', label: t('common.status') },
  { key: 'actions', label: '', width: '90px', align: 'right' },
]);
const roleOptions = computed(() => roles.value.map((role) => ({ value: role.name, label: t(`roles.${role.name}`, role.name) })));

const formOpen = ref(false);
const editing = ref<User | null>(null);
const selectedRoles = ref<string[]>([]);
const form = useForm(
  { email: '', password: '', firstName: '', lastName: '', phone: '', isActive: true },
  {
    email: [rules.required(t('validation.required')), rules.email(t('validation.email'))],
    password: [(value) => (editing.value || value ? true : t('validation.required')), rules.minLength(8, t('validation.minLength', { n: 8 }))],
    firstName: [rules.required(t('validation.required'))],
    lastName: [rules.required(t('validation.required'))],
  },
);

const openForm = (user: User | null): void => {
  editing.value = user;
  form.reset(user ? { email: user.email, password: '', firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '', isActive: user.isActive } : undefined);
  selectedRoles.value = user ? user.roles.map((role) => role.id) : [];
  formOpen.value = true;
};
const toggleRole = (id: string, checked: boolean): void => {
  selectedRoles.value = checked ? [...selectedRoles.value, id] : selectedRoles.value.filter((value) => value !== id);
};
const save = async (): Promise<void> => {
  if (selectedRoles.value.length === 0) {
    toast.warning(t('validation.required'), t('users.roles'));
    return;
  }
  const ok = await form.submit(async (values) => {
    const payload: UserPayload = {
      email: values.email.trim(),
      password: values.password || undefined,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim() || undefined,
      roleIds: selectedRoles.value,
      isActive: values.isActive,
    };
    if (editing.value) await usersApi.update(editing.value.id, payload);
    else await usersApi.create(payload);
    toast.success(t('common.saved'));
  });
  if (ok) {
    formOpen.value = false;
    await list.reload();
  } else if (form.serverError.value) toast.error(t('common.errorTitle'), form.serverError.value);
};
const remove = async (user: User): Promise<void> => {
  if (!(await confirm({ title: t('common.confirmDeleteTitle'), message: t('users.deleteConfirm', { email: user.email }), danger: true, confirmText: t('common.delete') }))) return;
  try {
    await usersApi.remove(user.id);
    toast.success(t('common.deleted'));
    await list.reload();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('users.title')" :subtitle="t('users.subtitle')">
      <template #actions><AppButton v-if="can('users.create')" icon="plus" @click="openForm(null)">{{ t('users.add') }}</AppButton></template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <div class="grow"><AppInput v-model="list.search.value" icon="search" :placeholder="t('common.search')" /></div>
        <AppSelect v-model="list.filters.role" :options="roleOptions" :placeholder="t('users.roles')" style="width: 190px" />
        <AppSelect :model-value="list.filters.isActive === undefined ? '' : String(list.filters.isActive)" :options="[{ value: 'true', label: t('users.active') }, { value: 'false', label: t('users.inactive') }]" :placeholder="t('common.status')" style="width: 150px" @update:model-value="list.filters.isActive = $event === '' ? undefined : $event === 'true'" />
      </div>
      <AppTable :columns="columns" :rows="list.items.value" :loading="list.loading.value" :error="list.error.value" :sort-by="list.sortBy.value" :sort-order="list.sortOrder.value" @sort="list.toggleSort" @retry="list.reload">
        <template #cell-lastName="{ row }">
          <div class="flex items-center gap-3">
            <AppAvatar :name="`${row.firstName} ${row.lastName}`" :size="34" />
            <div><p class="fw-600">{{ row.firstName }} {{ row.lastName }}</p><p class="text-muted" style="font-size: 12px">{{ row.email }}</p></div>
          </div>
        </template>
        <template #cell-roles="{ row }"><div class="flex gap-1 flex-wrap"><AppBadge v-for="role in row.roles" :key="role.id" size="sm" variant="primary">{{ t(`roles.${role.name}`, role.name) }}</AppBadge></div></template>
        <template #cell-phone="{ value }">{{ value ?? '—' }}</template>
        <template #cell-lastLoginAt="{ value }">{{ value ? dateTime(value) : t('users.never') }}</template>
        <template #cell-isActive="{ value }"><AppBadge :variant="value ? 'success' : 'neutral'" dot>{{ value ? t('users.active') : t('users.inactive') }}</AppBadge></template>
        <template #cell-actions="{ row }">
          <div class="flex gap-1" style="justify-content: flex-end">
            <AppButton v-if="can('users.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openForm(row)" />
            <AppButton v-if="can('users.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="remove(row)" />
          </div>
        </template>
      </AppTable>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>
    <AppModal v-model:open="formOpen" :title="editing ? t('users.edit') : t('users.add')">
      <form class="form-grid" novalidate @submit.prevent="save">
        <AppFormField :label="t('students.firstName')" :error="form.errors.firstName" required><AppInput v-model="form.values.firstName" :invalid="!!form.errors.firstName" /></AppFormField>
        <AppFormField :label="t('students.lastName')" :error="form.errors.lastName" required><AppInput v-model="form.values.lastName" :invalid="!!form.errors.lastName" /></AppFormField>
        <AppFormField :label="t('common.email')" :error="form.errors.email" required><AppInput v-model="form.values.email" type="email" :invalid="!!form.errors.email" /></AppFormField>
        <AppFormField :label="t('common.password')" :error="form.errors.password" :required="!editing" :hint="editing ? t('users.passwordHint') : undefined"><AppInput v-model="form.values.password" type="password" autocomplete="new-password" :invalid="!!form.errors.password" /></AppFormField>
        <AppFormField :label="t('common.phone')"><AppInput v-model="form.values.phone" /></AppFormField>
        <AppFormField :label="t('common.status')"><AppSwitch v-model="form.values.isActive" :label="t('users.isActive')" /></AppFormField>
        <AppFormField :label="t('users.roles')" class="span-2" required>
          <div class="roles">
            <AppCheckbox v-for="role in roles" :key="role.id" :model-value="selectedRoles.includes(role.id)" :label="t(`roles.${role.name}`, role.name)" @update:model-value="toggleRole(role.id, $event)" />
          </div>
        </AppFormField>
      </form>
      <template #footer>
        <AppButton variant="outline" @click="formOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="form.submitting.value" @click="save">{{ t('common.save') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: $space-2;
}
</style>
