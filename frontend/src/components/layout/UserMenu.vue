<script setup lang="ts">
import { AppAvatar, AppDropdown, AppIcon } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const notifications = useNotificationsStore();
const router = useRouter();
const { t } = useI18n();

const logout = async (): Promise<void> => {
  notifications.disconnect();
  await auth.logout();
  await router.push({ name: 'login' });
};
</script>

<template>
  <AppDropdown :width="220">
    <template #trigger>
      <button type="button" class="user-menu">
        <AppAvatar :name="auth.fullName" :src="auth.user?.avatarUrl" :size="34" />
        <span class="user-menu__text">
          <span class="user-menu__name">{{ auth.fullName }}</span>
          <span class="user-menu__role">{{ auth.roles.map((role) => t(`roles.${role}`, role)).join(', ') }}</span>
        </span>
        <AppIcon name="chevronDown" :size="16" class="user-menu__chevron" />
      </button>
    </template>
    <RouterLink to="/profile" class="dropdown-item"><AppIcon name="user" :size="16" /> {{ t('nav.profile') }}</RouterLink>
    <div class="dropdown-divider" />
    <button type="button" class="dropdown-item dropdown-item--danger" @click="logout"><AppIcon name="logout" :size="16" /> {{ t('nav.logout') }}</button>
  </AppDropdown>
</template>

<style scoped lang="scss">
.user-menu {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 8px 0 4px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  cursor: pointer;

  &:hover {
    background: $color-bg;
  }

  &__text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.2;

    @include down($bp-md) {
      display: none;
    }
  }

  &__name {
    font-weight: 600;
    font-size: 13px;
  }

  &__role {
    font-size: 11px;
    color: $color-text-muted;
  }

  &__chevron {
    color: $color-text-soft;

    @include down($bp-md) {
      display: none;
    }
  }
}
</style>
