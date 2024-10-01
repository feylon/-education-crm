<script setup lang="ts">
import { AppButton, AppFormField, AppInput } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { rules, useForm } from '@/composables/useForm';
import { useToast } from '@/composables/useToast';
import { homeRouteFor } from '@/router';
import { useAuthStore } from '@/stores/auth.store';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const { t } = useI18n();

const form = useForm(
  { email: '', password: '' },
  { email: [rules.required(t('validation.required')), rules.email(t('validation.email'))], password: [rules.required(t('validation.required'))] },
);

const demoAccounts = [
  { role: 'SUPER_ADMIN', email: 'superadmin@crm.local' },
  { role: 'ADMIN', email: 'admin@crm.local' },
  { role: 'MANAGER', email: 'manager@crm.local' },
  { role: 'CASHIER', email: 'cashier@crm.local' },
  { role: 'TEACHER', email: 'teacher@crm.local' },
  { role: 'STUDENT', email: 'student@crm.local' },
];

const redirect = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : null));

const submit = async (): Promise<void> => {
  const ok = await form.submit(async (values) => {
    await auth.login(values.email.trim(), values.password);
  });
  if (ok) {
    toast.success(t('auth.welcome', { name: auth.user?.firstName ?? '' }));
    await router.replace(redirect.value ?? homeRouteFor(auth));
  } else if (form.serverError.value) {
    form.serverError.value = errorMessage(new Error(form.serverError.value), t('auth.failed'));
  }
};

const fillDemo = (email: string): void => {
  form.values.email = email;
  form.values.password = 'Password123!';
};
</script>

<template>
  <div class="login">
    <h1 class="login__title">{{ t('auth.title') }}</h1>
    <p class="login__subtitle">{{ t('auth.subtitle') }}</p>
    <form class="login__form" novalidate @submit.prevent="submit">
      <AppFormField :label="t('auth.email')" :error="form.errors.email" for-id="email" required>
        <AppInput id="email" v-model="form.values.email" type="email" autocomplete="username" :invalid="!!form.errors.email" placeholder="name@example.com" @blur="form.validateField('email')" />
      </AppFormField>
      <AppFormField :label="t('auth.password')" :error="form.errors.password" for-id="password" required>
        <AppInput id="password" v-model="form.values.password" type="password" autocomplete="current-password" :invalid="!!form.errors.password" placeholder="••••••••" />
      </AppFormField>
      <p v-if="form.serverError.value" class="login__error">{{ form.serverError.value }}</p>
      <AppButton type="submit" block size="lg" :loading="form.submitting.value">{{ form.submitting.value ? t('auth.signingIn') : t('auth.submit') }}</AppButton>
    </form>
    <section class="login__demo">
      <p class="login__demo-title">{{ t('auth.demo') }}</p>
      <div class="login__demo-grid">
        <button v-for="account in demoAccounts" :key="account.email" type="button" class="login__demo-item" @click="fillDemo(account.email)">
          <span class="login__demo-role">{{ t(`roles.${account.role}`) }}</span>
          <span class="login__demo-email">{{ account.email }}</span>
        </button>
      </div>
      <p class="login__demo-hint">{{ t('auth.demoHint', { password: 'Password123!' }) }}</p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.login {
  width: 100%;
  max-width: 440px;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  padding: $space-8;

  @include down($bp-sm) {
    padding: $space-5;
  }

  &__title {
    font-size: 26px;
  }

  &__subtitle {
    color: $color-text-muted;
    margin-top: 4px;
    margin-bottom: $space-6;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $space-4;
  }

  &__error {
    background: $color-danger-soft;
    color: $color-danger;
    border-radius: $radius-md;
    padding: 10px 12px;
    font-size: 13px;
  }

  &__demo {
    margin-top: $space-6;
    padding-top: $space-5;
    border-top: 1px solid $color-border;
  }

  &__demo-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $color-text-muted;
    margin-bottom: $space-3;
  }

  &__demo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $space-2;
  }

  &__demo-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg;
    cursor: pointer;
    text-align: left;

    &:hover {
      border-color: $color-primary;
      background: $color-primary-soft;
    }
  }

  &__demo-role {
    font-size: 12px;
    font-weight: 600;
  }

  &__demo-email {
    font-size: 11px;
    color: $color-text-muted;
    @include truncate;
    max-width: 100%;
  }

  &__demo-hint {
    font-size: 12px;
    color: $color-text-soft;
    margin-top: $space-3;
  }
}
</style>
