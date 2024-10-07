<script setup lang="ts">
import { teachersApi } from '@/api/teachers.api';
import type { Lesson, TeacherDashboard } from '@/api/types';
import { AppButton, AppCard, AppEmpty, AppErrorState, AppLoading, AppPageHeader, AppStat, StatusBadge } from '@/components/ui';
import { useAsync } from '@/composables/useAsync';
import { useFormatters } from '@/composables/useFormatters';
import { useAuthStore } from '@/stores/auth.store';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import TeacherSchedulePanel from './TeacherSchedulePanel.vue';

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();
const { percent, date, time } = useFormatters();
const { data, loading, error, run } = useAsync<TeacherDashboard>(() => teachersApi.me());

const openAttendance = (lesson: Lesson): void => void router.push({ name: 'lesson-attendance', params: { id: lesson.id } });
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('teachers.myDashboard')" :subtitle="t('auth.welcome', { name: auth.user?.firstName ?? '' })" hide-breadcrumbs />
    <AppLoading v-if="loading && !data" />
    <AppErrorState v-else-if="error" :message="error" @retry="run" />
    <template v-else-if="data">
      <div class="grid grid-4">
        <AppStat :label="t('teachers.activeGroups')" :value="data.statistics.activeGroups" icon="groups" tone="primary" />
        <AppStat :label="t('teachers.students')" :value="data.statistics.students" icon="students" tone="info" />
        <AppStat :label="t('teachers.lessonsMonth')" :value="data.statistics.lessonsThisMonth" icon="lessons" tone="purple" />
        <AppStat :label="t('teachers.attendanceRate')" :value="percent(data.statistics.attendance.attendanceRate)" icon="attendance" tone="success" />
      </div>
      <div class="grid grid-2">
        <AppCard :title="t('teachers.todayLessons')" flush>
          <AppEmpty v-if="data.todayLessons.length === 0" :title="t('dashboard.noUpcoming')" icon="calendar" />
          <ul v-else class="lessons">
            <li v-for="lesson in data.todayLessons" :key="lesson.id" class="lessons__item">
              <span class="mono lessons__time">{{ time(lesson.startTime) }}–{{ time(lesson.endTime) }}</span>
              <span class="lessons__main"><strong>{{ lesson.group?.name }}</strong><span class="text-muted">{{ lesson.room?.name ?? '' }}</span></span>
              <StatusBadge :status="lesson.status" />
              <AppButton size="sm" variant="secondary" @click="openAttendance(lesson)">{{ t('teachers.markNow') }}</AppButton>
            </li>
          </ul>
        </AppCard>
        <AppCard :title="t('teachers.unmarked')" flush>
          <AppEmpty v-if="data.unmarkedLessons.length === 0" :title="t('teachers.noUnmarked')" icon="check" />
          <ul v-else class="lessons">
            <li v-for="lesson in data.unmarkedLessons" :key="lesson.id" class="lessons__item">
              <span class="mono lessons__time">{{ date(lesson.date) }} {{ time(lesson.startTime) }}</span>
              <span class="lessons__main"><strong>{{ lesson.group?.name }}</strong></span>
              <AppButton size="sm" variant="outline" @click="openAttendance(lesson)">{{ t('lessons.markAttendance') }}</AppButton>
            </li>
          </ul>
        </AppCard>
      </div>
      <div class="grid grid-2">
        <TeacherSchedulePanel :schedule="data.schedule" />
        <AppCard :title="t('teachers.upcomingLessons')" flush>
          <AppEmpty v-if="data.upcomingLessons.length === 0" :title="t('common.noData')" icon="calendar" />
          <ul v-else class="lessons">
            <li v-for="lesson in data.upcomingLessons" :key="lesson.id" class="lessons__item">
              <span class="mono lessons__time">{{ date(lesson.date) }} {{ time(lesson.startTime) }}</span>
              <span class="lessons__main"><strong>{{ lesson.group?.name }}</strong><span class="text-muted">{{ lesson.room?.name ?? '' }}</span></span>
            </li>
          </ul>
        </AppCard>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.lessons {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: 12px $space-5;
    border-top: 1px solid $color-border;
    font-size: 14px;
    flex-wrap: wrap;
  }

  &__time {
    font-size: 12px;
    color: $color-text-muted;
    white-space: nowrap;
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 120px;
    font-size: 13px;
  }
}
</style>
