<script setup lang="ts">
import AuthLayout from '@/components/layout/AuthLayout.vue';
import DefaultLayout from '@/components/layout/DefaultLayout.vue';
import { AppConfirmDialog, AppToaster } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const route = useRoute();
const ui = useUiStore();
const auth = useAuthStore();
const { locale, t } = useI18n();

const layout = computed(() => route.meta.layout ?? (auth.isAuthenticated ? 'default' : 'auth'));

watch(
  () => ui.locale,
  (value) => {
    locale.value = value;
    document.documentElement.lang = value;
  },
  { immediate: true },
);

watch(
  () => route.meta.titleKey,
  (key) => {
    document.title = key ? `${t(key)} · ${t('app.name')}` : t('app.name');
  },
  { immediate: true },
);
</script>

<template>
  <AuthLayout v-if="layout === 'auth'" />
  <DefaultLayout v-else-if="layout === 'default'" />
  <RouterView v-else />
  <AppToaster />
  <AppConfirmDialog />
</template>
