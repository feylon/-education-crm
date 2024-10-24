<script setup lang="ts">
import { schedulesApi } from '@/api/schedules.api';
import { studentsApi } from '@/api/students.api';
import type { CalendarView, StudentProfile } from '@/api/types';
import { AppBadge, AppCard, AppEmpty, AppErrorState, AppLoading, AppPageHeader, AppStat, AppTable, StatusBadge, type TableColumn } from '@/components/ui';
import { useAsync } from '@/composables/useAsync';
import { useFormatters } from '@/composables/useFormatters';
import { useAuthStore } from '@/stores/auth.store';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const auth = useAuthStore();
const { money, percent, date, dateTime, time, fullName, monthLabel } = useFormatters();
const { data: profile, loading, error, run } = useAsync<StudentProfile>(() => studentsApi.me());
const calendar = useAsync<CalendarView>(() => schedulesApi.calendar({}));

const groupColumns = computed<TableColumn[]>(() => [
  { key: 'group', label: t('groups.title') },
  { key: 'teacher', label: t('groups.teacher'), hideBelow: 'md' },
  { key: 'joinedAt', label: t('students.joined'), hideBelow: 'md' },
  { key: 'status', label: t('common.status') },
]);
const invoiceColumns = computed<TableColumn[]>(() => [
  { key: 'number', label: t('invoices.number') },
  { key: 'periodMonth', label: t('invoices.periodMonth') },
  { key: 'amount', label: t('invoices.amount'), align: 'right' },
  { key: 'paidAmount', label: t('invoices.paidAmount'), align: 'right', hideBelow: 'md' },
  { key: 'status', label: t('common.status') },
]);
const paymentColumns = computed<TableColumn[]>(() => [
  { key: 'number', label: t('payments.number') },
  { key: 'paidAt', label: t('payments.paidAt') },
  { key: 'amount', label: t('payments.amount'), align: 'right' },
  { key: 'method', label: t('payments.method'), hideBelow: 'md' },
]);
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('portal.title')" :subtitle="t('auth.welcome', { name: auth.user?.firstName ?? '' })" hide-breadcrumbs />
    <AppLoading v-if="loading && !profile" />
    <AppErrorState v-else-if="error" :message="error" @retry="run" />
    <template v-else-if="profile">
      <div class="banner" :class="profile.finance.debt > 0 ? 'banner--warn' : 'banner--ok'">
        {{ profile.finance.debt > 0 ? t('portal.debtWarning', { amount: money(profile.finance.debt) }) : t('portal.noDebt') }}
      </div>
      <div class="grid grid-4">
        <AppStat :label="t('students.totalPaid')" :value="money(profile.finance.totalPaid)" icon="payments" tone="success" />
        <AppStat :label="t('students.totalInvoiced')" :value="money(profile.finance.totalInvoiced)" icon="invoices" tone="info" />
        <AppStat :label="t('students.debt')" :value="money(profile.finance.debt)" icon="debtors" :tone="profile.finance.debt > 0 ? 'danger' : 'success'" />
        <AppStat :label="t('students.attendanceRate')" :value="percent(profile.attendance.attendanceRate)" icon="attendance" tone="primary" />
      </div>
      <div class="grid grid-2">
        <AppCard :title="t('portal.myGroups')" flush>
          <AppTable :columns="groupColumns" :rows="profile.enrollments" :empty-title="t('students.noGroups')">
            <template #cell-group="{ row }"><span class="fw-600">{{ row.group?.name }}</span><p class="text-muted" style="font-size: 12px">{{ row.group?.course?.name }}</p></template>
            <template #cell-teacher="{ row }">{{ fullName(row.group?.teacher) }}</template>
            <template #cell-joinedAt="{ value }">{{ date(value) }}</template>
            <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
          </AppTable>
        </AppCard>
        <AppCard :title="t('schedule.title')" flush>
          <AppLoading v-if="calendar.loading.value" inline />
          <AppEmpty v-else-if="!calendar.data.value?.events.length" :title="t('schedule.noEvents')" icon="calendar" />
          <ul v-else class="events">
            <li v-for="event in calendar.data.value.events" :key="event.id" class="events__item" :style="{ borderLeftColor: event.color ?? '#2563eb' }">
              <span class="mono text-muted">{{ date(event.date) }} {{ event.startTime }}–{{ event.endTime }}</span>
              <strong>{{ event.groupName }}</strong>
              <span class="text-muted">{{ event.roomName ?? '' }}</span>
              <AppBadge v-if="event.status" size="sm">{{ t(`status.${event.status}`) }}</AppBadge>
            </li>
          </ul>
        </AppCard>
      </div>
      <div class="grid grid-2">
        <AppCard :title="t('portal.myInvoices')" flush>
          <AppTable :columns="invoiceColumns" :rows="profile.finance.recentInvoices" dense>
            <template #cell-number="{ value }"><span class="mono">{{ value }}</span></template>
            <template #cell-periodMonth="{ value }">{{ monthLabel(value.slice(0, 7)) }}</template>
            <template #cell-amount="{ value }"><span class="mono">{{ money(value) }}</span></template>
            <template #cell-paidAmount="{ value }"><span class="mono">{{ money(value) }}</span></template>
            <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
          </AppTable>
        </AppCard>
        <AppCard :title="t('portal.myPayments')" flush>
          <AppTable :columns="paymentColumns" :rows="profile.finance.recentPayments" dense :empty-title="t('payments.noPayments')">
            <template #cell-number="{ value }"><span class="mono">{{ value }}</span></template>
            <template #cell-paidAt="{ value }">{{ dateTime(value) }}</template>
            <template #cell-amount="{ value }"><span class="mono fw-600">{{ money(value) }}</span></template>
            <template #cell-method="{ value }">{{ t(`status.${value}`) }}</template>
          </AppTable>
        </AppCard>
      </div>
      <AppCard :title="t('portal.myAttendance')" flush>
        <ul v-if="profile.attendance.recent.length" class="events">
          <li v-for="record in profile.attendance.recent" :key="record.id" class="events__item">
            <span class="mono text-muted">{{ date(record.lesson?.date) }} {{ time(record.lesson?.startTime) }}</span>
            <strong>{{ record.lesson?.group?.name }}</strong>
            <StatusBadge :status="record.status" />
          </li>
        </ul>
        <AppEmpty v-else :title="t('common.noData')" icon="attendance" />
      </AppCard>
    </template>
  </div>
</template>

<style scoped lang="scss">
.banner {
  padding: $space-4 $space-5;
  border-radius: $radius-lg;
  font-weight: 500;

  &--warn {
    background: $color-warning-soft;
    color: darken($color-warning, 10%);
  }

  &--ok {
    background: $color-success-soft;
    color: darken($color-success, 5%);
  }
}

.events {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: 10px $space-5;
    border-top: 1px solid $color-border;
    border-left: 3px solid transparent;
    font-size: 13px;
    flex-wrap: wrap;
  }
}
</style>
