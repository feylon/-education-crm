<script setup lang="ts">
import { notificationsApi } from '@/api/notifications.api';
import type { Notification } from '@/api/types';
import { AppBadge, AppButton, AppCard, AppCheckbox, AppEmpty, AppErrorState, AppFormField, AppInput, AppLoading, AppModal, AppPageHeader, AppPagination, AppSelect, AppTextarea } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { rules, useForm } from '@/composables/useForm';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { useNotificationsStore } from '@/stores/notifications.store';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { dateTime } = useFormatters();
const toast = useToast();
const store = useNotificationsStore();
const { can } = usePermissions();

const list = usePagination<Notification, { unreadOnly?: boolean }>((query) => notificationsApi.list(query), { limit: 20 });

watch(
  () => store.incoming,
  () => void list.reload(),
);

const markRead = async (item: Notification): Promise<void> => {
  if (item.isRead) return;
  await store.markRead(item.id);
  await list.reload();
};

const markAll = async (): Promise<void> => {
  await store.markAllRead();
  await list.reload();
  toast.success(t('notifications.allRead'));
};

const remove = async (item: Notification): Promise<void> => {
  await notificationsApi.remove(item.id);
  await list.reload();
  await store.loadUnread();
};

const sendOpen = ref(false);
const ROLE_OPTIONS = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEACHER', 'CASHIER', 'STUDENT'].map((role) => ({ value: role, label: t(`roles.${role}`) }));
const sendForm = useForm(
  { role: 'TEACHER', title: '', body: '' },
  { role: [rules.required(t('validation.required'))], title: [rules.required(t('validation.required'))], body: [rules.required(t('validation.required'))] },
);

const send = async (): Promise<void> => {
  const ok = await sendForm.submit(async (values) => {
    const result = await notificationsApi.send({ roles: [values.role], title: values.title, body: values.body });
    toast.success(t('notifications.sent', { n: result.sent }));
  });
  if (ok) {
    sendOpen.value = false;
    sendForm.reset();
    await list.reload();
  } else if (sendForm.serverError.value) {
    toast.error(t('common.errorTitle'), errorMessage(new Error(sendForm.serverError.value)));
  }
};

const variantFor = (type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' => {
  if (type === 'PAYMENT_RECEIVED') return 'success';
  if (type === 'DEBT_REMINDER' || type === 'PAYMENT_REMINDER') return 'warning';
  if (type === 'ATTENDANCE_MARKED') return 'danger';
  if (type === 'SYSTEM') return 'neutral';
  return 'primary';
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('notifications.title')" :subtitle="t('notifications.subtitle')">
      <template #actions>
        <AppButton variant="outline" icon="check" :disabled="store.unreadCount === 0" @click="markAll">{{ t('notifications.markAllRead') }}</AppButton>
        <AppButton v-if="can('notifications.send')" icon="plus" @click="sendOpen = true">{{ t('notifications.send') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard flush>
      <div class="toolbar" style="padding: 16px 20px">
        <AppCheckbox :model-value="!!list.filters.unreadOnly" :label="t('notifications.unreadOnly')" @update:model-value="list.filters.unreadOnly = $event || undefined" />
        <span class="text-muted">{{ t('notifications.unread', { n: store.unreadCount }) }}</span>
      </div>
      <AppLoading v-if="list.loading.value && list.items.value.length === 0" />
      <AppErrorState v-else-if="list.error.value" :message="list.error.value" @retry="list.reload" />
      <AppEmpty v-else-if="list.items.value.length === 0" :title="t('notifications.empty')" icon="bell" />
      <ul v-else class="notes">
        <li v-for="item in list.items.value" :key="item.id" class="notes__item" :class="{ 'notes__item--unread': !item.isRead }" @click="markRead(item)">
          <div class="notes__badge"><AppBadge :variant="variantFor(item.type)" size="sm">{{ t(`notifications.types.${item.type}`, item.type) }}</AppBadge></div>
          <div class="notes__content">
            <p class="notes__title">{{ item.title }}</p>
            <p class="notes__body">{{ item.body }}</p>
            <p class="notes__time">{{ dateTime(item.createdAt) }}</p>
          </div>
          <div class="notes__actions">
            <AppButton v-if="!item.isRead" variant="ghost" size="sm" icon="check" icon-only :title="t('notifications.markRead')" @click.stop="markRead(item)" />
            <AppButton variant="ghost" size="sm" icon="trash" icon-only :title="t('common.delete')" @click.stop="remove(item)" />
          </div>
        </li>
      </ul>
      <AppPagination v-model:page="list.page.value" v-model:limit="list.limit.value" :total-pages="list.totalPages.value" :total="list.total.value" />
    </AppCard>

    <AppModal v-model:open="sendOpen" :title="t('notifications.sendTitle')">
      <div class="flex-col">
        <AppFormField :label="t('notifications.byRole')" :error="sendForm.errors.role" required>
          <AppSelect v-model="sendForm.values.role" :options="ROLE_OPTIONS" :clearable="false" />
        </AppFormField>
        <AppFormField :label="t('notifications.titleField')" :error="sendForm.errors.title" required>
          <AppInput v-model="sendForm.values.title" :invalid="!!sendForm.errors.title" />
        </AppFormField>
        <AppFormField :label="t('notifications.body')" :error="sendForm.errors.body" required>
          <AppTextarea v-model="sendForm.values.body" :rows="4" :invalid="!!sendForm.errors.body" />
        </AppFormField>
      </div>
      <template #footer>
        <AppButton variant="outline" @click="sendOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="sendForm.submitting.value" @click="send">{{ t('notifications.send') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.notes {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: flex;
    gap: $space-4;
    align-items: flex-start;
    padding: $space-4 $space-5;
    border-top: 1px solid $color-border;
    cursor: pointer;

    &:hover {
      background: #f8fafc;
    }

    &--unread {
      background: #f0f6ff;
    }
  }

  &__badge {
    padding-top: 2px;
    width: 130px;
    flex-shrink: 0;

    @include down($bp-sm) {
      display: none;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-weight: 600;
  }

  &__body {
    color: $color-text-muted;
    font-size: 13px;
    margin-top: 2px;
  }

  &__time {
    color: $color-text-soft;
    font-size: 12px;
    margin-top: 4px;
  }

  &__actions {
    display: flex;
    gap: 2px;
  }
}

.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
</style>
