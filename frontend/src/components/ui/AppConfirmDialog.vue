<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm';
import { useI18n } from 'vue-i18n';
import AppButton from './AppButton.vue';
import AppModal from './AppModal.vue';

const { state, answer } = useConfirm();
const { t } = useI18n();
</script>

<template>
  <AppModal :open="state.open" :title="state.options.title" size="sm" @update:open="answer(false)">
    <p class="text-muted">{{ state.options.message ?? t('common.confirmDeleteMessage') }}</p>
    <template #footer>
      <AppButton variant="outline" @click="answer(false)">{{ state.options.cancelText ?? t('common.cancel') }}</AppButton>
      <AppButton :variant="state.options.danger ? 'danger' : 'primary'" @click="answer(true)">{{ state.options.confirmText ?? t('common.confirm') }}</AppButton>
    </template>
  </AppModal>
</template>
