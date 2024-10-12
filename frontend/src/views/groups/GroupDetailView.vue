<script setup lang="ts">
import { attendanceApi } from '@/api/attendance.api';
import { groupsApi } from '@/api/groups.api';
import { paymentsApi } from '@/api/payments.api';
import type { Enrollment, Group, GroupJournal, GroupStatistics, Payment } from '@/api/types';
import { AppBadge, AppButton, AppCard, AppEmpty, AppErrorState, AppLoading, AppPageHeader, AppPagination, AppStat, AppTable, AppTabs, StatusBadge, type TableColumn } from '@/components/ui';
import { errorMessage, useAsync } from '@/composables/useAsync';
import { useConfirm } from '@/composables/useConfirm';
import { addDaysIso, todayIso, useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import ScheduleSlotModal from '../schedule/ScheduleSlotModal.vue';
import EnrollModal from './EnrollModal.vue';
import GroupFormModal from './GroupFormModal.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();
const { money, percent, date, dateTime, time, fullName } = useFormatters();

const groupId = computed(() => String(route.params.id));
const { data: group, loading, error, run } = useAsync<Group>(() => groupsApi.get(groupId.value));
const stats = useAsync<GroupStatistics>(() => groupsApi.statistics(groupId.value));
watch(groupId, () => {
  void run();
  void stats.run();
});

const tab = ref('students');
const tabs = computed(() => [
  { key: 'students', label: t('groups.tabs.students'), count: group.value?.studentsCount },
  { key: 'schedule', label: t('groups.tabs.schedule'), count: group.value?.schedules?.length },
  { key: 'attendance', label: t('groups.tabs.attendance') },
  { key: 'payments', label: t('groups.tabs.payments') },
  { key: 'statistics', label: t('groups.tabs.statistics') },
]);

const students = usePagination<Enrollment, { status?: string }>((query) => groupsApi.students(groupId.value, query), { limit: 50 });
const payments = usePagination<Payment>((query) => paymentsApi.list({ ...query, groupId: groupId.value }), { immediate: false, limit: 15 });
const journal = ref<GroupJournal | null>(null);
const journalLoading = ref(false);
const loadJournal = async (): Promise<void> => {
  journalLoading.value = true;
  try {
    journal.value = await attendanceApi.journal(groupId.value, addDaysIso(todayIso(), -45), addDaysIso(todayIso(), 14));
  } catch (caught) {
    toast.error(t('common.errorTitle'), errorMessage(caught));
  } finally {
    journalLoading.value = false;
  }
};
watch(tab, (value) => {
  if (value === 'payments' && payments.items.value.length === 0) void payments.load();
  if (value === 'attendance' && !journal.value) void loadJournal();
});

const studentColumns = computed<TableColumn[]>(() => [
  { key: 'student', label: t('groups.student') },
  { key: 'phone', label: t('common.phone'), hideBelow: 'md' },
  { key: 'joinedAt', label: t('groups.joinedAt'), hideBelow: 'md' },
  { key: 'discountPercent', label: t('groups.discount'), align: 'right', hideBelow: 'lg' },
  { key: 'status', label: t('common.status') },
  { key: 'actions', label: '', width: '90px', align: 'right' },
]);
const paymentColumns = computed<TableColumn[]>(() => [
  { key: 'number', label: t('payments.number') },
  { key: 'student', label: t('payments.student') },
  { key: 'paidAt', label: t('payments.paidAt'), hideBelow: 'md' },
  { key: 'amount', label: t('payments.amount'), align: 'right' },
  { key: 'status', label: t('common.status') },
]);

const formOpen = ref(false);
const enrollOpen = ref(false);
const editingEnrollment = ref<Enrollment | null>(null);
const slotOpen = ref(false);
const editingSlot = ref<string | null>(null);

const openEnroll = (enrollment: Enrollment | null): void => {
  editingEnrollment.value = enrollment;
  enrollOpen.value = true;
};
const unenroll = async (enrollment: Enrollment): Promise<void> => {
  if (!(await confirm({ title: t('groups.unenroll'), message: t('groups.unenrollConfirm', { name: fullName(enrollment.student) }), danger: true, confirmText: t('groups.unenroll') }))) return;
  try {
    await groupsApi.unenroll(groupId.value, enrollment.id);
    toast.success(t('common.saved'));
    await Promise.all([students.reload(), run(), stats.run()]);
  } catch (caught) {
    toast.error(t('common.errorTitle'), errorMessage(caught));
  }
};
const afterEnroll = async (): Promise<void> => {
  await Promise.all([students.reload(), run(), stats.run()]);
};
const removeSlot = async (id: string): Promise<void> => {
  if (!(await confirm({ title: t('schedule.deleteConfirm'), danger: true, confirmText: t('common.delete') }))) return;
  const { schedulesApi } = await import('@/api/schedules.api');
  await schedulesApi.remove(id);
  toast.success(t('common.deleted'));
  await run();
};
const openStudent = (enrollment: Enrollment): void => void router.push({ name: 'student-detail', params: { id: enrollment.studentId } });
const openLesson = (lessonId: string): void => void router.push({ name: 'lesson-attendance', params: { id: lessonId } });

const cellClass = (status: string | null): string => (status ? `cell--${status.toLowerCase()}` : 'cell--none');
const cellLabel = (status: string | null): string => (status ? status.charAt(0) : '·');
</script>

<template>
  <div class="page">
    <AppLoading v-if="loading && !group" />
    <AppErrorState v-else-if="error" :message="error" @retry="run" />
    <template v-else-if="group">
      <AppPageHeader :title="group.name" :subtitle="`${group.course?.name ?? ''} · ${group.teacher ? fullName(group.teacher) : t('groups.noTeacher')}`">
        <template #actions>
          <StatusBadge :status="group.status" />
          <AppButton v-if="can('groups.update')" variant="outline" icon="edit" @click="formOpen = true">{{ t('common.edit') }}</AppButton>
        </template>
      </AppPageHeader>
      <div class="grid grid-4">
        <AppStat :label="t('groups.students')" :value="t('groups.studentsCount', { n: group.studentsCount ?? 0, capacity: group.capacity })" :hint="stats.data.value ? `${t('groups.statistics.fillRate')}: ${stats.data.value.students.fillRate}%` : undefined" icon="students" tone="primary" />
        <AppStat :label="t('groups.monthlyFee')" :value="money(group.monthlyFee)" :hint="`${date(group.startDate)} — ${group.endDate ? date(group.endDate) : '…'}`" icon="money" tone="info" />
        <AppStat :label="t('groups.statistics.attendance')" :value="stats.data.value ? percent(stats.data.value.attendance.attendanceRate) : '—'" :hint="stats.data.value ? `${stats.data.value.lessons.completed} / ${stats.data.value.lessons.total} ${t('groups.statistics.lessons').toLowerCase()}` : undefined" icon="attendance" tone="success" />
        <AppStat :label="t('groups.statistics.debt')" :value="stats.data.value ? money(stats.data.value.finance.debt) : '—'" :hint="stats.data.value ? `${stats.data.value.finance.openInvoices} ${t('groups.statistics.openInvoices')}` : undefined" icon="debtors" :tone="stats.data.value && stats.data.value.finance.debt > 0 ? 'danger' : 'success'" />
      </div>
      <AppTabs v-model="tab" :tabs="tabs" />

      <AppCard v-if="tab === 'students'" flush>
        <template #actions>
          <AppButton v-if="can('groups.enroll')" icon="plus" size="sm" @click="openEnroll(null)">{{ t('groups.enroll') }}</AppButton>
        </template>
        <AppTable :columns="studentColumns" :rows="students.items.value" :loading="students.loading.value" :error="students.error.value" clickable @row-click="openStudent" @retry="students.reload">
          <template #cell-student="{ row }"><span class="fw-600">{{ fullName(row.student) }}</span></template>
          <template #cell-phone="{ row }">{{ row.student?.phone }}</template>
          <template #cell-joinedAt="{ value }">{{ date(value) }}</template>
          <template #cell-discountPercent="{ value }">{{ percent(value) }}</template>
          <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
          <template #cell-actions="{ row }">
            <div v-if="can('groups.enroll')" class="flex gap-1" style="justify-content: flex-end" @click.stop>
              <AppButton variant="ghost" size="sm" icon="edit" icon-only @click="openEnroll(row)" />
              <AppButton v-if="row.status === 'ACTIVE'" variant="ghost" size="sm" icon="x" icon-only :title="t('groups.unenroll')" @click="unenroll(row)" />
            </div>
          </template>
        </AppTable>
        <AppPagination v-model:page="students.page.value" v-model:limit="students.limit.value" :total-pages="students.totalPages.value" :total="students.total.value" />
      </AppCard>

      <AppCard v-else-if="tab === 'schedule'" :title="t('schedule.slots')" flush>
        <template #actions>
          <AppButton v-if="can('schedules.create')" icon="plus" size="sm" @click="editingSlot = null; slotOpen = true">{{ t('groups.addSlot') }}</AppButton>
        </template>
        <AppEmpty v-if="!group.schedules?.length" :title="t('groups.scheduleEmpty')" icon="calendar" />
        <ul v-else class="slots">
          <li v-for="slot in [...group.schedules].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))" :key="slot.id" class="slots__item">
            <span class="slots__day">{{ t(`common.weekdays.${slot.weekday}`) }}</span>
            <span class="mono">{{ time(slot.startTime) }} – {{ time(slot.endTime) }}</span>
            <span class="text-muted">{{ slot.room?.name ?? group.room?.name ?? t('groups.noRoom') }}</span>
            <span class="text-soft" style="font-size: 12px">{{ date(slot.effectiveFrom) }} → {{ slot.effectiveTo ? date(slot.effectiveTo) : '…' }}</span>
            <div v-if="can('schedules.update')" class="flex gap-1" style="margin-left: auto">
              <AppButton variant="ghost" size="sm" icon="edit" icon-only @click="editingSlot = slot.id; slotOpen = true" />
              <AppButton v-if="can('schedules.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="removeSlot(slot.id)" />
            </div>
          </li>
        </ul>
      </AppCard>

      <AppCard v-else-if="tab === 'attendance'" :title="t('lessons.journal')" :subtitle="t('lessons.journalHint')" flush>
        <AppLoading v-if="journalLoading" />
        <AppEmpty v-else-if="!journal || journal.lessons.length === 0" :title="t('common.noData')" icon="attendance" />
        <div v-else class="journal-wrap">
          <table class="journal">
            <thead>
              <tr>
                <th class="journal__name">{{ t('groups.student') }}</th>
                <th v-for="lesson in journal.lessons" :key="lesson.id" class="journal__lesson" :title="`${lesson.date} ${time(lesson.startTime)}`" @click="openLesson(lesson.id)">
                  {{ lesson.date.slice(8) }}<span class="journal__month">{{ lesson.date.slice(5, 7) }}</span>
                </th>
                <th class="journal__rate">{{ t('lessons.rate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in journal.students" :key="row.studentId">
                <td class="journal__name">{{ row.lastName }} {{ row.firstName }}</td>
                <td v-for="cell in row.cells" :key="cell.lessonId" class="journal__cell" @click="openLesson(cell.lessonId)">
                  <span class="cell" :class="cellClass(cell.status)" :title="cell.status ?? ''">{{ cellLabel(cell.status) }}</span>
                </td>
                <td class="journal__rate mono">{{ percent(row.attendanceRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard v-else-if="tab === 'payments'" flush>
        <AppTable :columns="paymentColumns" :rows="payments.items.value" :loading="payments.loading.value" :error="payments.error.value" :empty-title="t('payments.noPayments')" @retry="payments.reload">
          <template #cell-number="{ value }"><span class="mono fw-600">{{ value }}</span></template>
          <template #cell-student="{ row }">{{ fullName(row.student) }}</template>
          <template #cell-paidAt="{ value }">{{ dateTime(value) }}</template>
          <template #cell-amount="{ value }"><span class="mono fw-600">{{ money(value) }}</span></template>
          <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        </AppTable>
        <AppPagination v-model:page="payments.page.value" v-model:limit="payments.limit.value" :total-pages="payments.totalPages.value" :total="payments.total.value" />
      </AppCard>

      <div v-else-if="tab === 'statistics'">
        <AppLoading v-if="stats.loading.value && !stats.data.value" />
        <div v-else-if="stats.data.value" class="grid grid-3">
          <AppCard :title="t('groups.students')">
            <dl class="kv">
              <dt>{{ t('groups.statistics.active') }}</dt><dd>{{ stats.data.value.students.active }}</dd>
              <dt>{{ t('groups.statistics.left') }}</dt><dd>{{ stats.data.value.students.left }}</dd>
              <dt>{{ t('status.COMPLETED') }}</dt><dd>{{ stats.data.value.students.completed }}</dd>
              <dt>{{ t('groups.capacity') }}</dt><dd>{{ stats.data.value.students.capacity }}</dd>
              <dt>{{ t('groups.statistics.fillRate') }}</dt><dd><AppBadge variant="primary">{{ stats.data.value.students.fillRate }}%</AppBadge></dd>
            </dl>
          </AppCard>
          <AppCard :title="t('groups.statistics.lessons')">
            <dl class="kv">
              <dt>{{ t('common.total') }}</dt><dd>{{ stats.data.value.lessons.total }}</dd>
              <dt>{{ t('groups.statistics.completed') }}</dt><dd>{{ stats.data.value.lessons.completed }}</dd>
              <dt>{{ t('groups.statistics.planned') }}</dt><dd>{{ stats.data.value.lessons.planned }}</dd>
              <dt>{{ t('status.CANCELLED') }}</dt><dd>{{ stats.data.value.lessons.cancelled }}</dd>
              <dt>{{ t('groups.statistics.attendance') }}</dt><dd><AppBadge variant="success">{{ percent(stats.data.value.attendance.attendanceRate) }}</AppBadge></dd>
              <dt>{{ t('lessons.present') }} / {{ t('lessons.late') }}</dt><dd>{{ stats.data.value.attendance.present }} / {{ stats.data.value.attendance.late }}</dd>
              <dt>{{ t('lessons.absent') }} / {{ t('lessons.excused') }}</dt><dd>{{ stats.data.value.attendance.absent }} / {{ stats.data.value.attendance.excused }}</dd>
            </dl>
          </AppCard>
          <AppCard :title="t('nav.finance')">
            <dl class="kv">
              <dt>{{ t('groups.statistics.invoiced') }}</dt><dd class="mono">{{ money(stats.data.value.finance.invoiced) }}</dd>
              <dt>{{ t('groups.statistics.paid') }}</dt><dd class="mono">{{ money(stats.data.value.finance.paid) }}</dd>
              <dt>{{ t('groups.statistics.debt') }}</dt><dd class="mono text-danger">{{ money(stats.data.value.finance.debt) }}</dd>
              <dt>{{ t('payments.openInvoices') }}</dt><dd>{{ stats.data.value.finance.openInvoices }}</dd>
            </dl>
          </AppCard>
        </div>
      </div>

      <GroupFormModal v-model:open="formOpen" :group="group" @saved="run(); stats.run()" />
      <EnrollModal v-model:open="enrollOpen" :group-id="group.id" :enrollment="editingEnrollment" @saved="afterEnroll" />
      <ScheduleSlotModal v-model:open="slotOpen" :group-id="group.id" :schedule-id="editingSlot" :schedules="group.schedules ?? []" @saved="run" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.slots {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: flex;
    align-items: center;
    gap: $space-4;
    padding: 12px $space-5;
    border-top: 1px solid $color-border;
    flex-wrap: wrap;
  }

  &__day {
    font-weight: 600;
    min-width: 110px;
  }
}

.kv {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: $space-2 $space-4;
  margin: 0;

  dt {
    color: $color-text-muted;
  }

  dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
  }
}

.journal-wrap {
  overflow-x: auto;
}

.journal {
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;

  th,
  td {
    border-bottom: 1px solid $color-border;
    padding: 6px 4px;
    text-align: center;
  }

  th {
    background: #fafbfd;
    font-size: 11px;
    color: $color-text-muted;
    font-weight: 600;
  }

  &__name {
    text-align: left !important;
    padding-left: $space-5 !important;
    white-space: nowrap;
    min-width: 180px;
    position: sticky;
    left: 0;
    background: $color-surface;
  }

  &__lesson {
    cursor: pointer;
    min-width: 34px;

    &:hover {
      color: $color-primary;
    }
  }

  &__month {
    display: block;
    font-weight: 400;
    color: $color-text-soft;
  }

  &__rate {
    padding-right: $space-5 !important;
    font-weight: 600;
  }

  &__cell {
    cursor: pointer;
  }
}

.cell {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;

  &--present {
    background: $color-success-soft;
    color: $color-success;
  }

  &--absent {
    background: $color-danger-soft;
    color: $color-danger;
  }

  &--late {
    background: $color-warning-soft;
    color: $color-warning;
  }

  &--excused {
    background: $color-info-soft;
    color: $color-info;
  }

  &--none {
    color: $color-text-soft;
  }
}
</style>
