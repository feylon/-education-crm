<script setup lang="ts">
import { groupsApi } from '@/api/groups.api';
import { schedulesApi } from '@/api/schedules.api';
import { teachersApi } from '@/api/teachers.api';
import type { CalendarEvent, CalendarView, Group, Room, Teacher } from '@/api/types';
import { AppBadge, AppButton, AppCard, AppEmpty, AppErrorState, AppLoading, AppPageHeader, AppSearchSelect, AppSelect } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { addDaysIso, startOfWeekIso, todayIso, useFormatters } from '@/composables/useFormatters';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import ScheduleSlotModal from './ScheduleSlotModal.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { can } = usePermissions();
const { date } = useFormatters();

const weekStart = ref(startOfWeekIso(todayIso()));
const filters = reactive<{ teacherId: string | null; roomId: string; groupId: string | null }>({ teacherId: null, roomId: '', groupId: null });
const rooms = ref<Room[]>([]);
const data = ref<CalendarView | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const slotOpen = ref(false);

onMounted(async () => {
  rooms.value = await schedulesApi.rooms().catch(() => []);
});

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await schedulesApi.calendar({
      from: weekStart.value,
      to: addDaysIso(weekStart.value, 6),
      teacherId: filters.teacherId ?? undefined,
      roomId: filters.roomId || undefined,
      groupId: filters.groupId ?? undefined,
    });
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
};
watch([weekStart, () => filters.teacherId, () => filters.roomId, () => filters.groupId], load, { immediate: true });

const days = computed(() => Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart.value, index)));
const eventsByDay = computed(() => {
  const map = new Map<string, CalendarEvent[]>();
  for (const day of days.value) map.set(day, []);
  for (const event of data.value?.events ?? []) map.get(event.date)?.push(event);
  return map;
});
const today = todayIso();

const openEvent = (event: CalendarEvent): void => {
  if (event.kind === 'LESSON') void router.push({ name: 'lesson-attendance', params: { id: event.id } });
  else void router.push({ name: 'group-detail', params: { id: event.groupId } });
};

const fetchTeachers = (search: string): Promise<Teacher[]> => teachersApi.lookup(search);
const fetchGroups = (search: string): Promise<Group[]> => groupsApi.lookup(search);
const shiftWeek = (delta: number): void => {
  weekStart.value = addDaysIso(weekStart.value, delta * 7);
};
const onSaved = (): void => {
  toast.success(t('common.saved'));
  void load();
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('schedule.title')" :subtitle="t('schedule.subtitle')">
      <template #actions>
        <AppButton v-if="can('schedules.create')" icon="plus" @click="slotOpen = true">{{ t('schedule.addSlot') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppCard>
      <div class="toolbar">
        <div class="week-nav">
          <AppButton variant="outline" icon="chevronLeft" icon-only :title="t('schedule.prevWeek')" @click="shiftWeek(-1)" />
          <AppButton variant="outline" @click="weekStart = startOfWeekIso(todayIso())">{{ t('schedule.today') }}</AppButton>
          <AppButton variant="outline" icon="chevronRight" icon-only :title="t('schedule.nextWeek')" @click="shiftWeek(1)" />
          <strong class="week-nav__label">{{ date(weekStart) }} – {{ date(addDaysIso(weekStart, 6)) }}</strong>
        </div>
        <div class="grow" style="max-width: 240px">
          <AppSearchSelect v-model="filters.teacherId" :fetcher="fetchTeachers" :label-of="(item: Teacher) => `${item.lastName} ${item.firstName}`" :placeholder="t('schedule.filterTeacher')" />
        </div>
        <div class="grow" style="max-width: 240px">
          <AppSearchSelect v-model="filters.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :placeholder="t('schedule.filterGroup')" />
        </div>
        <AppSelect v-model="filters.roomId" :options="rooms.map((room) => ({ value: room.id, label: room.name }))" :placeholder="t('schedule.filterRoom')" style="width: 170px" />
      </div>
    </AppCard>
    <AppErrorState v-if="error" :message="error" @retry="load" />
    <AppCard v-else flush>
      <AppLoading v-if="loading && !data" />
      <div v-else class="calendar">
        <div v-for="day in days" :key="day" class="calendar__day" :class="{ 'calendar__day--today': day === today }">
          <header class="calendar__head">
            <span class="calendar__weekday">{{ t(`common.weekdaysShort.${new Date(day + 'T00:00:00').getDay() === 0 ? 7 : new Date(day + 'T00:00:00').getDay()}`) }}</span>
            <span class="calendar__date">{{ day.slice(8) }}</span>
          </header>
          <div class="calendar__events">
            <button v-for="event in eventsByDay.get(day)" :key="event.id" type="button" class="event" :class="`event--${event.kind.toLowerCase()}`" :style="{ borderLeftColor: event.color ?? '#2563eb' }" @click="openEvent(event)">
              <span class="event__time mono">{{ event.startTime }}–{{ event.endTime }}</span>
              <span class="event__title">{{ event.groupName }}</span>
              <span class="event__meta">{{ event.teacherName ?? '' }}<template v-if="event.roomName"> · {{ event.roomName }}</template></span>
              <AppBadge v-if="event.status" size="sm" :variant="event.status === 'COMPLETED' ? 'success' : event.status === 'CANCELLED' ? 'danger' : 'info'">{{ t(`status.${event.status}`) }}</AppBadge>
            </button>
          </div>
        </div>
      </div>
      <AppEmpty v-if="data && data.events.length === 0 && !loading" :title="t('schedule.noEvents')" icon="calendar" />
      <template #footer>
        <div class="legend">
          <span class="legend__item"><span class="legend__swatch legend__swatch--lesson" /> {{ t('schedule.legendLesson') }}</span>
          <span class="legend__item"><span class="legend__swatch legend__swatch--slot" /> {{ t('schedule.legendSlot') }}</span>
        </div>
      </template>
    </AppCard>
    <ScheduleSlotModal v-model:open="slotOpen" @saved="onSaved" />
  </div>
</template>

<style scoped lang="scss">
.week-nav {
  display: flex;
  align-items: center;
  gap: $space-2;

  &__label {
    margin-left: $space-2;
    white-space: nowrap;
  }
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  min-height: 420px;

  @include down($bp-lg) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include down($bp-sm) {
    grid-template-columns: 1fr;
  }

  &__day {
    border-right: 1px solid $color-border;
    display: flex;
    flex-direction: column;

    &:last-child {
      border-right: none;
    }

    &--today .calendar__head {
      background: $color-primary-soft;
      color: $color-primary-hover;
    }
  }

  &__head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 10px $space-3;
    border-bottom: 1px solid $color-border;
    background: #fafbfd;
  }

  &__weekday {
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 600;
    color: $color-text-muted;
  }

  &__date {
    font-size: 18px;
    font-weight: 700;
  }

  &__events {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: $space-2;
    flex: 1;
  }
}

.event {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid $color-border;
  border-left: 3px solid $color-primary;
  border-radius: $radius-sm;
  background: $color-surface;
  text-align: left;
  cursor: pointer;
  font-size: 12px;

  &:hover {
    box-shadow: $shadow-md;
  }

  &--slot {
    background: #f8fafc;
    border-style: dashed;
    opacity: 0.85;
  }

  &__time {
    color: $color-text-muted;
    font-size: 11px;
  }

  &__title {
    font-weight: 600;
    font-size: 13px;
  }

  &__meta {
    color: $color-text-muted;
    @include truncate;
  }
}

.legend {
  display: flex;
  gap: $space-5;
  font-size: 12px;
  color: $color-text-muted;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__swatch {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid $color-border;
    border-left: 3px solid $color-primary;
    background: $color-surface;

    &--slot {
      border-style: dashed;
      background: #f8fafc;
    }
  }
}
</style>
