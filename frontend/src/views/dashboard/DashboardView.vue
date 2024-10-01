<script setup lang="ts">
import { reportsApi } from '@/api/reports.api';
import BarChart from '@/components/charts/BarChart.vue';
import DoughnutChart from '@/components/charts/DoughnutChart.vue';
import LineChart from '@/components/charts/LineChart.vue';
import { AppCard, AppEmpty, AppErrorState, AppLoading, AppPageHeader, AppStat, StatusBadge } from '@/components/ui';
import { useAsync } from '@/composables/useAsync';
import { useFormatters } from '@/composables/useFormatters';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, te } = useI18n();
const { money, number, percent, monthLabel, dateTime, time } = useFormatters();
const { data, loading, error, run } = useAsync(() => reportsApi.dashboard());

const revenueLabels = computed(() => data.value?.charts.revenueByMonth.map((point) => monthLabel(point.period)) ?? []);
const revenueValues = computed(() => data.value?.charts.revenueByMonth.map((point) => point.value) ?? []);
const attendanceLabels = computed(() => data.value?.charts.attendanceByMonth.map((point) => monthLabel(point.period)) ?? []);
const attendanceValues = computed(() => data.value?.charts.attendanceByMonth.map((point) => point.rate) ?? []);
const methodLabels = computed(() => data.value?.charts.paymentsByMethod.map((row) => t(`status.${row.method}`)) ?? []);
const methodValues = computed(() => data.value?.charts.paymentsByMethod.map((row) => row.total) ?? []);
const statusLabels = computed(() => data.value?.charts.studentsByStatus.map((row) => t(`status.${row.status}`)) ?? []);
const statusValues = computed(() => data.value?.charts.studentsByStatus.map((row) => row.count) ?? []);
const topGroupLabels = computed(() => data.value?.charts.topGroupsByStudents.map((row) => row.groupName) ?? []);
const topGroupValues = computed(() => data.value?.charts.topGroupsByStudents.map((row) => row.students) ?? []);

const actionLabel = (action: string): string => (te(`audit.actions.${action}`) ? t(`audit.actions.${action}`) : action);
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')" hide-breadcrumbs />
    <AppLoading v-if="loading && !data" />
    <AppErrorState v-else-if="error" :message="error" @retry="run" />
    <template v-else-if="data">
      <div class="grid grid-4">
        <AppStat :label="t('dashboard.students')" :value="number(data.counters.students)" :hint="t('dashboard.activeStudents', { n: data.counters.activeStudents })" icon="students" tone="primary" />
        <AppStat :label="t('dashboard.teachers')" :value="number(data.counters.teachers)" icon="teachers" tone="purple" />
        <AppStat :label="t('dashboard.groups')" :value="number(data.counters.groups)" :hint="t('dashboard.activeGroups', { n: data.counters.activeGroups })" icon="groups" tone="info" />
        <AppStat :label="t('dashboard.courses')" :value="number(data.counters.courses)" icon="courses" tone="success" />
      </div>
      <div class="grid grid-4">
        <AppStat
          :label="t('dashboard.todayAttendance')"
          :value="percent(data.today.attendance.attendanceRate)"
          :hint="t('dashboard.todayLessons', { done: data.today.lessonsCompleted, total: data.today.lessons })"
          icon="attendance"
          tone="success"
        />
        <AppStat :label="t('dashboard.todayPayments')" :value="money(data.today.payments.total)" :hint="t('dashboard.paymentsCount', { n: data.today.payments.count })" icon="money" tone="primary" />
        <AppStat :label="t('dashboard.monthRevenue')" :value="money(data.month.revenue)" :hint="t('dashboard.monthInvoiced', { amount: money(data.month.invoiced) })" icon="payments" tone="info" />
        <AppStat :label="t('dashboard.totalDebt')" :value="money(data.debt.total)" :hint="t('dashboard.debtors', { n: data.debt.debtors, overdue: data.debt.overdueInvoices })" icon="debtors" tone="danger" />
      </div>
      <div class="grid grid-2">
        <AppCard :title="t('dashboard.revenueChart')">
          <LineChart :labels="revenueLabels" :datasets="[{ label: t('reports.revenue'), data: revenueValues }]" :formatter="money" />
        </AppCard>
        <AppCard :title="t('dashboard.attendanceChart')">
          <LineChart :labels="attendanceLabels" :datasets="[{ label: t('reports.attendance'), data: attendanceValues, color: '#059669' }]" :formatter="percent" :suggested-max="100" />
        </AppCard>
      </div>
      <div class="grid grid-3">
        <AppCard :title="t('dashboard.paymentsByMethod')">
          <DoughnutChart v-if="methodValues.length" :labels="methodLabels" :values="methodValues" :formatter="money" />
          <AppEmpty v-else :title="t('common.noData')" />
        </AppCard>
        <AppCard :title="t('dashboard.studentsByStatus')">
          <DoughnutChart v-if="statusValues.length" :labels="statusLabels" :values="statusValues" :colors="['#059669', '#9ca3af', '#2563eb', '#dc2626']" />
          <AppEmpty v-else :title="t('common.noData')" />
        </AppCard>
        <AppCard :title="t('dashboard.topGroups')">
          <BarChart v-if="topGroupValues.length" :labels="topGroupLabels" :datasets="[{ label: t('dashboard.students'), data: topGroupValues }]" horizontal />
          <AppEmpty v-else :title="t('common.noData')" />
        </AppCard>
      </div>
      <div class="grid grid-2">
        <AppCard :title="t('dashboard.upcomingLessons')" flush>
          <ul v-if="data.upcomingLessons.length" class="list">
            <li v-for="lesson in data.upcomingLessons" :key="lesson.id" class="list__item">
              <span class="list__time mono">{{ time(lesson.startTime) }}–{{ time(lesson.endTime) }}</span>
              <span class="list__main">
                <strong>{{ lesson.group?.name }}</strong>
                <span class="text-muted">{{ lesson.teacher ? `${lesson.teacher.lastName} ${lesson.teacher.firstName}` : '' }} {{ lesson.room ? `· ${lesson.room.name}` : '' }}</span>
              </span>
              <StatusBadge :status="lesson.status" />
            </li>
          </ul>
          <AppEmpty v-else :title="t('dashboard.noUpcoming')" icon="calendar" />
        </AppCard>
        <AppCard :title="t('dashboard.recentActivity')" flush>
          <ul v-if="data.recentActivity.length" class="list">
            <li v-for="entry in data.recentActivity" :key="entry.id" class="list__item">
              <span class="list__main">
                <strong>{{ entry.userEmail ?? t('audit.system') }}</strong>
                <span class="text-muted">{{ actionLabel(entry.action) }} · {{ entry.entity }}</span>
              </span>
              <span class="text-soft list__time">{{ dateTime(entry.createdAt) }}</span>
            </li>
          </ul>
          <AppEmpty v-else :title="t('common.noData')" icon="audit" />
        </AppCard>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.list {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: 12px $space-5;
    border-bottom: 1px solid $color-border;

    &:last-child {
      border-bottom: none;
    }
  }

  &__time {
    font-size: 12px;
    white-space: nowrap;
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-size: 13px;

    strong {
      @include truncate;
    }
  }
}
</style>
