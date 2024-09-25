<script setup lang="ts">
import { AppDropdown, AppIcon } from '@/components/ui';
import { useFormatters } from '@/composables/useFormatters';
import { useToast } from '@/composables/useToast';
import { useNotificationsStore } from '@/stores/notifications.store';
import { onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const store = useNotificationsStore();
const { t } = useI18n();
const { dateTime } = useFormatters();
const toast = useToast();
const router = useRouter();

onMounted(async () => {
  await Promise.all([store.loadUnread(), store.loadLatest()]);
  store.connect();
});

watch(
  () => store.incoming,
  (notification) => {
    if (notification) toast.info(notification.title, notification.body);
  },
);

const openAll = (): void => void router.push('/notifications');
</script>

<template>
  <AppDropdown :width="360">
    <template #trigger>
      <button type="button" class="bell" :title="t('nav.notifications')">
        <AppIcon name="bell" :size="20" />
        <span v-if="store.unreadCount > 0" class="bell__badge">{{ store.unreadCount > 99 ? '99+' : store.unreadCount }}</span>
      </button>
    </template>
    <div class="bell-menu" @click.stop>
      <header class="bell-menu__header">
        <strong>{{ t('nav.notifications') }}</strong>
        <button v-if="store.unreadCount > 0" type="button" class="bell-menu__link" @click="store.markAllRead()">{{ t('notifications.markAllRead') }}</button>
      </header>
      <p v-if="store.latest.length === 0" class="bell-menu__empty">{{ t('notifications.empty') }}</p>
      <ul v-else class="bell-menu__list">
        <li v-for="item in store.latest" :key="item.id" class="bell-menu__item" :class="{ 'bell-menu__item--unread': !item.isRead }" @click="!item.isRead && store.markRead(item.id)">
          <p class="bell-menu__title">{{ item.title }}</p>
          <p class="bell-menu__body">{{ item.body }}</p>
          <p class="bell-menu__time">{{ dateTime(item.createdAt) }}</p>
        </li>
      </ul>
      <footer class="bell-menu__footer">
        <button type="button" class="bell-menu__link" @click="openAll">{{ t('notifications.viewAll') }}</button>
      </footer>
    </div>
  </AppDropdown>
</template>

<style scoped lang="scss">
.bell {
  position: relative;
  width: 36px;
  height: 36px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  color: $color-text-muted;
  cursor: pointer;
  display: grid;
  place-items: center;

  &:hover {
    color: $color-text;
    background: $color-bg;
  }

  &__badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: $radius-full;
    background: $color-danger;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    display: grid;
    place-items: center;
  }
}

.bell-menu {
  display: flex;
  flex-direction: column;
  max-height: 440px;

  &__header,
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
  }

  &__footer {
    border-top: 1px solid $color-border;
    justify-content: center;
  }

  &__link {
    border: none;
    background: transparent;
    color: $color-primary;
    font-size: 13px;
    cursor: pointer;
  }

  &__empty {
    padding: $space-6;
    text-align: center;
    color: $color-text-muted;
    font-size: 13px;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
  }

  &__item {
    padding: 10px;
    border-top: 1px solid $color-border;
    cursor: pointer;

    &:hover {
      background: $color-bg;
    }

    &--unread {
      background: #f0f6ff;
    }
  }

  &__title {
    font-weight: 600;
    font-size: 13px;
  }

  &__body {
    font-size: 13px;
    color: $color-text-muted;
    margin-top: 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__time {
    font-size: 11px;
    color: $color-text-soft;
    margin-top: 4px;
  }
}
</style>
