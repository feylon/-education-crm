<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string; padded?: boolean; flush?: boolean }>(), { padded: true, flush: false });
</script>

<template>
  <section class="card" :class="{ 'card--flush': flush }">
    <header v-if="title || $slots.header || $slots.actions" class="card__header">
      <div class="card__heading">
        <slot name="header">
          <h3 class="card__title">{{ title }}</h3>
          <p v-if="subtitle" class="card__subtitle">{{ subtitle }}</p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="card__actions"><slot name="actions" /></div>
    </header>
    <div class="card__body" :class="{ 'card__body--padded': padded && !flush }">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="card__footer"><slot name="footer" /></footer>
  </section>
</template>

<style scoped lang="scss">
.card {
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  display: flex;
  flex-direction: column;
  min-width: 0;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-3;
    padding: $space-4 $space-5;
    border-bottom: 1px solid $color-border;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 15px;
  }

  &__subtitle {
    font-size: 13px;
    color: $color-text-muted;
    margin-top: 2px;
  }

  &__actions {
    display: flex;
    gap: $space-2;
    align-items: center;
    flex-wrap: wrap;
  }

  &__body--padded {
    padding: $space-5;
  }

  &__footer {
    padding: $space-3 $space-5;
    border-top: 1px solid $color-border;
    background: #fafbfd;
    border-radius: 0 0 $radius-lg $radius-lg;
  }
}
</style>
