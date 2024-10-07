<script setup lang="ts">
import type { Schedule } from '@/api/types';
import { AppCard, AppEmpty } from '@/components/ui';
import { useFormatters } from '@/composables/useFormatters';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ schedule: Schedule[] }>();
const { t } = useI18n();
const { time } = useFormatters();

const byDay = computed(() => {
  const days = new Map<number, Schedule[]>();
  for (const slot of props.schedule) {
    days.set(slot.weekday, [...(days.get(slot.weekday) ?? []), slot]);
  }
  return [...days.entries()].sort(([a], [b]) => a - b);
});
</script>

<template>
  <AppCard :title="t('teachers.schedule')" flush>
    <AppEmpty v-if="schedule.length === 0" :title="t('groups.scheduleEmpty')" icon="calendar" />
    <div v-else class="week">
      <div v-for="[weekday, slots] in byDay" :key="weekday" class="week__day">
        <p class="week__name">{{ t(`common.weekdays.${weekday}`) }}</p>
        <div v-for="slot in slots" :key="slot.id" class="week__slot" :style="{ borderLeftColor: slot.group?.course?.color ?? '#2563eb' }">
          <span class="mono">{{ time(slot.startTime) }}–{{ time(slot.endTime) }}</span>
          <strong>{{ slot.group?.name }}</strong>
          <span class="text-muted">{{ slot.room?.name ?? '' }}</span>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped lang="scss">
.week {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: $space-3;
  padding: $space-4 $space-5;

  &__name {
    font-weight: 600;
    font-size: 13px;
    color: $color-text-muted;
    margin-bottom: $space-2;
  }

  &__slot {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border: 1px solid $color-border;
    border-left: 3px solid $color-primary;
    border-radius: $radius-sm;
    background: #fafbfd;
    font-size: 13px;
    margin-bottom: $space-2;
  }
}
</style>
