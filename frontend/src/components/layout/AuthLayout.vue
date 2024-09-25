<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './LanguageSwitcher.vue';

const { t } = useI18n();
</script>

<template>
  <div class="auth-layout">
    <aside class="auth-layout__side">
      <div class="auth-layout__brand">
        <span class="auth-layout__logo">E</span>
        <span>{{ t('app.name') }}</span>
      </div>
      <h2 class="auth-layout__tagline">{{ t('app.tagline') }}</h2>
      <ul class="auth-layout__features">
        <li>{{ t('nav.students') }} · {{ t('nav.groups') }} · {{ t('nav.schedule') }}</li>
        <li>{{ t('nav.attendance') }} · {{ t('nav.payments') }} · {{ t('nav.debtors') }}</li>
        <li>{{ t('nav.reports') }} · {{ t('nav.notifications') }}</li>
      </ul>
    </aside>
    <main class="auth-layout__main">
      <div class="auth-layout__lang"><LanguageSwitcher /></div>
      <RouterView />
    </main>
  </div>
</template>

<style scoped lang="scss">
.auth-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);

  @include down($bp-lg) {
    grid-template-columns: 1fr;
  }

  &__side {
    background: linear-gradient(160deg, #0f172a 0%, #1e3a8a 100%);
    color: #e2e8f0;
    padding: $space-10;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: $space-6;

    @include down($bp-lg) {
      display: none;
    }
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: $space-3;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
  }

  &__logo {
    width: 40px;
    height: 40px;
    border-radius: $radius-md;
    background: $color-primary;
    display: grid;
    place-items: center;
  }

  &__tagline {
    font-size: 32px;
    font-weight: 700;
    color: #fff;
    max-width: 420px;
  }

  &__features {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: $space-2;
    color: #cbd5e1;
  }

  &__main {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $space-8 $space-4;
  }

  &__lang {
    position: absolute;
    top: $space-5;
    right: $space-5;
  }
}
</style>
