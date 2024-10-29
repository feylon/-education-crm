<script setup lang="ts">
import { usersApi, type RolePayload } from '@/api/users.api';
import type { Permission, Role } from '@/api/types';
import { AppBadge, AppButton, AppCard, AppCheckbox, AppEmpty, AppFormField, AppInput, AppLoading, AppModal, AppPageHeader, AppTextarea } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { useConfirm } from '@/composables/useConfirm';
import { rules, useForm } from '@/composables/useForm';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();

const roles = ref<Role[]>([]);
const permissions = ref<Permission[]>([]);
const loading = ref(true);
const load = async (): Promise<void> => {
  loading.value = true;
  try {
    [roles.value, permissions.value] = await Promise.all([usersApi.roles(), usersApi.permissions()]);
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const modules = computed(() => {
  const map = new Map<string, Permission[]>();
  for (const permission of permissions.value) map.set(permission.module, [...(map.get(permission.module) ?? []), permission]);
  return [...map.entries()];
});

const formOpen = ref(false);
const editing = ref<Role | null>(null);
const selected = ref<Set<string>>(new Set());
const form = useForm({ name: '', description: '' }, { name: [rules.required(t('validation.required')), (value) => (/^[A-Z][A-Z0-9_]{1,49}$/.test(String(value)) ? true : t('rolesPage.nameHint'))] });

const openForm = (role: Role | null): void => {
  editing.value = role;
  form.reset(role ? { name: role.name, description: role.description ?? '' } : undefined);
  selected.value = new Set(role?.permissions.map((permission) => permission.code) ?? []);
  formOpen.value = true;
};
const toggle = (code: string, checked: boolean): void => {
  const next = new Set(selected.value);
  if (checked) next.add(code);
  else next.delete(code);
  selected.value = next;
};
const toggleModule = (codes: string[], checked: boolean): void => {
  const next = new Set(selected.value);
  for (const code of codes) {
    if (checked) next.add(code);
    else next.delete(code);
  }
  selected.value = next;
};
const save = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    const payload: RolePayload = { name: values.name.trim(), description: values.description.trim() || undefined, permissions: [...selected.value] };
    if (editing.value) await usersApi.updateRole(editing.value.id, editing.value.isSystem ? { description: payload.description, permissions: payload.permissions } : payload);
    else await usersApi.createRole(payload);
    toast.success(t('common.saved'));
  });
  if (ok) {
    formOpen.value = false;
    await load();
  } else if (form.serverError.value) toast.error(t('common.errorTitle'), form.serverError.value);
};
const remove = async (role: Role): Promise<void> => {
  if (!(await confirm({ title: t('common.confirmDeleteTitle'), message: t('rolesPage.deleteConfirm', { name: role.name }), danger: true, confirmText: t('common.delete') }))) return;
  try {
    await usersApi.removeRole(role.id);
    toast.success(t('common.deleted'));
    await load();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('rolesPage.title')" :subtitle="t('rolesPage.subtitle')">
      <template #actions><AppButton v-if="can('roles.create')" icon="plus" @click="openForm(null)">{{ t('rolesPage.add') }}</AppButton></template>
    </AppPageHeader>
    <AppLoading v-if="loading && roles.length === 0" />
    <AppEmpty v-else-if="roles.length === 0" :title="t('common.noData')" />
    <div v-else class="grid grid-3">
      <AppCard v-for="role in roles" :key="role.id">
        <template #header>
          <div>
            <h3 class="flex items-center gap-2">{{ t(`roles.${role.name}`, role.name) }} <AppBadge size="sm" :variant="role.isSystem ? 'neutral' : 'purple'">{{ role.isSystem ? t('rolesPage.system') : t('rolesPage.custom') }}</AppBadge></h3>
            <p class="text-muted" style="font-size: 13px">{{ role.description ?? role.name }}</p>
          </div>
        </template>
        <template #actions>
          <AppButton v-if="can('roles.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openForm(role)" />
          <AppButton v-if="can('roles.delete') && !role.isSystem" variant="ghost" size="sm" icon="trash" icon-only @click="remove(role)" />
        </template>
        <div class="flex gap-2 flex-wrap mb-4">
          <AppBadge variant="primary">{{ t('rolesPage.permissionsCount', { n: role.permissions.length }) }}</AppBadge>
          <AppBadge>{{ t('rolesPage.users', { n: role.usersCount ?? 0 }) }}</AppBadge>
        </div>
        <div class="perm-list">
          <span v-for="[module, perms] in modules" :key="module" class="perm-module" :class="{ 'perm-module--none': !perms.some((p) => role.permissions.some((rp) => rp.code === p.code)) }">
            {{ t(`rolesPage.modules.${module}`, module) }}
            <small>{{ perms.filter((p) => role.permissions.some((rp) => rp.code === p.code)).length }}/{{ perms.length }}</small>
          </span>
        </div>
      </AppCard>
    </div>
    <AppModal v-model:open="formOpen" :title="editing ? t('rolesPage.edit') : t('rolesPage.add')" size="lg">
      <div class="flex-col">
        <div class="grid grid-2">
          <AppFormField :label="t('rolesPage.name')" :error="form.errors.name" :hint="t('rolesPage.nameHint')" required><AppInput v-model="form.values.name" :disabled="!!editing?.isSystem" :invalid="!!form.errors.name" @update:model-value="form.values.name = $event.toUpperCase()" /></AppFormField>
          <AppFormField :label="t('common.description')"><AppTextarea v-model="form.values.description" :rows="1" /></AppFormField>
        </div>
        <div class="perm-grid">
          <div v-for="[module, perms] in modules" :key="module" class="perm-group">
            <div class="flex items-center justify-between">
              <strong>{{ t(`rolesPage.modules.${module}`, module) }}</strong>
              <AppCheckbox :model-value="perms.every((p) => selected.has(p.code))" :label="t('rolesPage.selectAll')" :disabled="editing?.name === 'SUPER_ADMIN'" @update:model-value="toggleModule(perms.map((p) => p.code), $event)" />
            </div>
            <div class="perm-group__items">
              <AppCheckbox v-for="permission in perms" :key="permission.code" :model-value="selected.has(permission.code)" :disabled="editing?.name === 'SUPER_ADMIN'" @update:model-value="toggle(permission.code, $event)">
                <span class="mono">{{ permission.code.split('.')[1] }}</span> <span class="text-muted">— {{ permission.description }}</span>
              </AppCheckbox>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="text-muted" style="margin-right: auto">{{ t('rolesPage.permissionsCount', { n: selected.size }) }}</span>
        <AppButton variant="outline" @click="formOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="form.submitting.value" :disabled="editing?.name === 'SUPER_ADMIN'" @click="save">{{ t('common.save') }}</AppButton>
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

.perm-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.perm-module {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: $radius-full;
  background: $color-success-soft;
  color: darken($color-success, 5%);

  small {
    opacity: 0.8;
    margin-left: 4px;
  }

  &--none {
    background: $color-bg;
    color: $color-text-soft;
  }
}

.perm-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $space-3;

  @include down($bp-md) {
    grid-template-columns: 1fr;
  }
}

.perm-group {
  border: 1px solid $color-border;
  border-radius: $radius-md;
  padding: $space-3;

  &__items {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: $space-2;
    font-size: 13px;
  }
}
</style>
