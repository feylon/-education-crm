<script setup lang="ts">
import { authApi } from '@/api/auth.api';
import { AppAvatar, AppBadge, AppButton, AppCard, AppFormField, AppInput, AppPageHeader, AppSelect } from '@/components/ui';
import { rules, useForm } from '@/composables/useForm';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { SUPPORTED_LOCALES, useUiStore, type Locale } from '@/stores/ui.store';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const ui = useUiStore();
const notifications = useNotificationsStore();
const router = useRouter();
const toast = useToast();
const { t, locale } = useI18n();

const form = useForm(
  { currentPassword: '', newPassword: '', confirmPassword: '' },
  {
    currentPassword: [rules.required(t('validation.required'))],
    newPassword: [rules.required(t('validation.required')), rules.minLength(8, t('validation.minLength', { n: 8 }))],
    confirmPassword: [(value, values) => (value === values.newPassword ? true : t('validation.passwordsMismatch'))],
  },
);

const changePassword = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    await authApi.changePassword(values.currentPassword, values.newPassword);
  });
  if (ok) {
    toast.success(t('auth.passwordChanged'));
    notifications.disconnect();
    await auth.logout();
    await router.push({ name: 'login' });
  }
};

const changeLocale = (value: string): void => {
  ui.setLocale(value as Locale);
  locale.value = value as Locale;
};

const permissionsByModule = () => {
  const map = new Map<string, string[]>();
  for (const code of auth.user?.permissions ?? []) {
    const [module] = code.split('.');
    map.set(module, [...(map.get(module) ?? []), code]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('profile.title')" :subtitle="t('profile.subtitle')" />
    <div class="grid grid-2">
      <AppCard :title="t('profile.account')">
        <div class="profile">
          <AppAvatar :name="auth.fullName" :src="auth.user?.avatarUrl" :size="64" />
          <div>
            <h2>{{ auth.fullName }}</h2>
            <p class="text-muted">{{ auth.user?.email }}</p>
            <p v-if="auth.user?.phone" class="text-muted">{{ auth.user.phone }}</p>
            <div class="flex gap-2 flex-wrap mt-2">
              <AppBadge v-for="role in auth.roles" :key="role" variant="primary">{{ t(`roles.${role}`, role) }}</AppBadge>
            </div>
          </div>
        </div>
        <div class="mt-6">
          <AppFormField :label="t('profile.language')">
            <AppSelect :model-value="ui.locale" :clearable="false" :options="SUPPORTED_LOCALES.map((code) => ({ value: code, label: t(`language.${code}`) }))" @update:model-value="changeLocale" />
          </AppFormField>
        </div>
      </AppCard>
      <AppCard :title="t('profile.security')">
        <form class="flex-col" novalidate @submit.prevent="changePassword">
          <AppFormField :label="t('auth.currentPassword')" :error="form.errors.currentPassword" required>
            <AppInput v-model="form.values.currentPassword" type="password" autocomplete="current-password" :invalid="!!form.errors.currentPassword" />
          </AppFormField>
          <AppFormField :label="t('auth.newPassword')" :error="form.errors.newPassword" required>
            <AppInput v-model="form.values.newPassword" type="password" autocomplete="new-password" :invalid="!!form.errors.newPassword" />
          </AppFormField>
          <AppFormField :label="t('auth.confirmPassword')" :error="form.errors.confirmPassword" required>
            <AppInput v-model="form.values.confirmPassword" type="password" autocomplete="new-password" :invalid="!!form.errors.confirmPassword" />
          </AppFormField>
          <p v-if="form.serverError.value" class="text-danger">{{ form.serverError.value }}</p>
          <AppButton type="submit" :loading="form.submitting.value">{{ t('auth.changePassword') }}</AppButton>
        </form>
      </AppCard>
    </div>
    <AppCard :title="t('profile.permissions')">
      <div class="perm-grid">
        <div v-for="[module, codes] in permissionsByModule()" :key="module" class="perm-group">
          <p class="perm-group__title">{{ t(`rolesPage.modules.${module}`, module) }}</p>
          <div class="flex gap-1 flex-wrap">
            <AppBadge v-for="code in codes" :key="code" size="sm">{{ code.split('.')[1] }}</AppBadge>
          </div>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<style scoped lang="scss">
.profile {
  display: flex;
  gap: $space-4;
  align-items: flex-start;
}

.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  max-width: 420px;
}

.perm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: $space-4;
}

.perm-group__title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
}
</style>
