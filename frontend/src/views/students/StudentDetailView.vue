<script setup lang="ts">
import { attendanceApi } from '@/api/attendance.api';
import { paymentsApi } from '@/api/payments.api';
import { studentsApi } from '@/api/students.api';
import type { AttendanceRecord, Payment, Student, StudentProfile } from '@/api/types';
import { AppAvatar, AppBadge, AppButton, AppCard, AppErrorState, AppLoading, AppPageHeader, AppPagination, AppStat, AppTable, AppTabs, StatusBadge, type TableColumn } from '@/components/ui';
import { useAsync } from '@/composables/useAsync';
import { useFormatters } from '@/composables/useFormatters';
import { usePagination } from '@/composables/usePagination';
import { usePermissions } from '@/composables/usePermissions';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import PaymentFormModal from '../payments/PaymentFormModal.vue';
import StudentFormModal from './StudentFormModal.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { can } = usePermissions();
const { money, percent, date, dateTime, time, fullName } = useFormatters();

const studentId = computed(() => String(route.params.id));
const { data: profile, loading, error, run } = useAsync<StudentProfile>(() => studentsApi.profile(studentId.value));
watch(studentId, () => void run());

const tab = ref('overview');
const tabs = computed(() => [
  { key: 'overview', label: t('students.tabs.overview') },
  { key: 'groups', label: t('students.tabs.groups'), count: profile.value?.enrollments.length },
  { key: 'attendance', label: t('students.tabs.attendance') },
  { key: 'payments', label: t('students.tabs.payments') },
]);

const formOpen = ref(false);
const paymentOpen = ref(false);

const attendanceList = usePagination<AttendanceRecord>((query) => attendanceApi.studentHistory(studentId.value, query), { immediate: false, limit: 15 });
const paymentsList = usePagination<Payment>((query) => paymentsApi.studentHistory(studentId.value, query), { immediate: false, limit: 15 });
watch(tab, (value) => {
  if (value === 'attendance' && attendanceList.items.value.length === 0) void attendanceList.load();
  if (value === 'payments' && paymentsList.items.value.length === 0) void paymentsList.load();
});

const attendanceColumns = computed<TableColumn[]>(() => [
  { key: 'date', label: t('lessons.date') },
  { key: 'group', label: t('lessons.group') },
  { key: 'status', label: t('common.status') },
  { key: 'note', label: t('lessons.note'), hideBelow: 'md' },
]);
const paymentColumns = computed<TableColumn[]>(() => [
  { key: 'number', label: t('payments.number') },
  { key: 'paidAt', label: t('payments.paidAt') },
  { key: 'amount', label: t('payments.amount'), align: 'right' },
  { key: 'method', label: t('payments.method'), hideBelow: 'md' },
  { key: 'status', label: t('common.status') },
]);
const enrollmentColumns = computed<TableColumn[]>(() => [
  { key: 'group', label: t('groups.title') },
  { key: 'course', label: t('groups.course'), hideBelow: 'md' },
  { key: 'teacher', label: t('groups.teacher'), hideBelow: 'lg' },
  { key: 'joinedAt', label: t('students.joined') },
  { key: 'leftAt', label: t('students.left'), hideBelow: 'md' },
  { key: 'discountPercent', label: t('students.discount'), align: 'right', hideBelow: 'md' },
  { key: 'status', label: t('common.status') },
]);

const afterSave = async (): Promise<void> => {
  await run();
  if (tab.value === 'payments') await paymentsList.reload();
};

const student = computed<Student | null>(() => profile.value?.student ?? null);
</script>

<template>
  <div class="page">
    <AppLoading v-if="loading && !profile" />
    <AppErrorState v-else-if="error" :message="error" @retry="run" />
    <template v-else-if="profile && student">
      <AppPageHeader :title="`${student.lastName} ${student.firstName}`" :subtitle="student.phone">
        <template #actions>
          <AppButton v-if="can('payments.create')" variant="secondary" icon="money" @click="paymentOpen = true">{{ t('payments.add') }}</AppButton>
          <AppButton v-if="can('students.update')" variant="outline" icon="edit" @click="formOpen = true">{{ t('common.edit') }}</AppButton>
        </template>
      </AppPageHeader>
      <div class="grid grid-4">
        <AppStat :label="t('students.totalPaid')" :value="money(profile.finance.totalPaid)" icon="payments" tone="success" />
        <AppStat :label="t('students.totalInvoiced')" :value="money(profile.finance.totalInvoiced)" icon="invoices" tone="info" />
        <AppStat :label="t('students.debt')" :value="money(profile.finance.debt)" :hint="`${t('payments.openInvoices')}: ${profile.finance.openInvoices}`" icon="debtors" :tone="profile.finance.debt > 0 ? 'danger' : 'success'" />
        <AppStat :label="t('students.attendanceRate')" :value="percent(profile.attendance.attendanceRate)" :hint="`${profile.attendance.present + profile.attendance.late} / ${profile.attendance.total}`" icon="attendance" tone="primary" />
      </div>
      <AppTabs v-model="tab" :tabs="tabs" />
      <div v-if="tab === 'overview'" class="grid grid-2">
        <AppCard :title="t('students.profile')">
          <div class="profile-head">
            <AppAvatar :src="student.photoUrl" :name="`${student.firstName} ${student.lastName}`" :size="72" />
            <div>
              <h2>{{ student.lastName }} {{ student.firstName }} {{ student.middleName ?? '' }}</h2>
              <div class="flex gap-2 mt-2 flex-wrap">
                <StatusBadge :status="student.status" />
                <AppBadge v-if="student.gender">{{ t(`status.${student.gender}`) }}</AppBadge>
                <AppBadge :variant="student.userId ? 'success' : 'neutral'">{{ student.userId ? t('students.hasAccount') : t('students.noAccount') }}</AppBadge>
              </div>
            </div>
          </div>
          <dl class="details">
            <dt>{{ t('common.phone') }}</dt><dd>{{ student.phone }}</dd>
            <dt>{{ t('common.email') }}</dt><dd>{{ student.email ?? '—' }}</dd>
            <dt>{{ t('students.birthDate') }}</dt><dd>{{ date(student.birthDate) }}</dd>
            <dt>{{ t('students.passport') }}</dt><dd>{{ student.passportSeries || student.passportNumber ? `${student.passportSeries ?? ''} ${student.passportNumber ?? ''}` : '—' }}</dd>
            <dt>{{ t('common.address') }}</dt><dd>{{ student.address ?? '—' }}</dd>
            <dt>{{ t('students.branch') }}</dt><dd>{{ student.branch?.name ?? '—' }}</dd>
            <dt>{{ t('students.emergencyContact') }}</dt><dd>{{ student.emergencyContactName ? `${student.emergencyContactName} · ${student.emergencyContactPhone ?? ''}` : '—' }}</dd>
            <dt>{{ t('common.createdAt') }}</dt><dd>{{ dateTime(student.createdAt) }}</dd>
            <dt v-if="student.notes">{{ t('common.notes') }}</dt><dd v-if="student.notes">{{ student.notes }}</dd>
          </dl>
        </AppCard>
        <div class="flex-col">
          <AppCard :title="t('students.parents')" flush>
            <ul v-if="student.parents?.length" class="simple-list">
              <li v-for="parent in student.parents" :key="parent.id" class="simple-list__item">
                <div>
                  <p class="fw-600">{{ parent.fullName }} <AppBadge v-if="parent.isPrimary" size="sm" variant="primary">{{ t('students.isPrimary') }}</AppBadge></p>
                  <p class="text-muted">{{ t(`students.relations.${parent.relation}`, parent.relation) }} · {{ parent.phone }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="text-muted" style="padding: 20px">{{ t('common.none') }}</p>
          </AppCard>
          <AppCard :title="t('students.recentAttendance')" flush>
            <ul v-if="profile.attendance.recent.length" class="simple-list">
              <li v-for="record in profile.attendance.recent" :key="record.id" class="simple-list__item">
                <span>{{ date(record.lesson?.date) }} · {{ record.lesson?.group?.name }}</span>
                <StatusBadge :status="record.status" />
              </li>
            </ul>
            <p v-else class="text-muted" style="padding: 20px">{{ t('common.noData') }}</p>
          </AppCard>
        </div>
      </div>
      <AppCard v-else-if="tab === 'groups'" :title="t('students.enrollmentHistory')" flush>
        <AppTable :columns="enrollmentColumns" :rows="profile.enrollments" clickable :empty-title="t('students.noGroups')" @row-click="(row) => router.push({ name: 'group-detail', params: { id: row.groupId } })">
          <template #cell-group="{ row }"><span class="fw-600">{{ row.group?.name }}</span></template>
          <template #cell-course="{ row }">{{ row.group?.course?.name ?? '—' }}</template>
          <template #cell-teacher="{ row }">{{ fullName(row.group?.teacher) }}</template>
          <template #cell-joinedAt="{ value }">{{ date(value) }}</template>
          <template #cell-leftAt="{ value }">{{ date(value) }}</template>
          <template #cell-discountPercent="{ value }">{{ percent(value) }}</template>
          <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        </AppTable>
      </AppCard>
      <AppCard v-else-if="tab === 'attendance'" flush>
        <AppTable :columns="attendanceColumns" :rows="attendanceList.items.value" :loading="attendanceList.loading.value" :error="attendanceList.error.value" @retry="attendanceList.reload">
          <template #cell-date="{ row }">{{ date(row.lesson?.date) }} <span class="text-muted">{{ time(row.lesson?.startTime) }}</span></template>
          <template #cell-group="{ row }">{{ row.lesson?.group?.name }}</template>
          <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
          <template #cell-note="{ value }">{{ value ?? '—' }}</template>
        </AppTable>
        <AppPagination v-model:page="attendanceList.page.value" v-model:limit="attendanceList.limit.value" :total-pages="attendanceList.totalPages.value" :total="attendanceList.total.value" />
      </AppCard>
      <AppCard v-else-if="tab === 'payments'" flush>
        <AppTable :columns="paymentColumns" :rows="paymentsList.items.value" :loading="paymentsList.loading.value" :error="paymentsList.error.value" :empty-title="t('payments.noPayments')" @retry="paymentsList.reload">
          <template #cell-number="{ value, row }"><span class="mono fw-600">{{ value }}</span><p class="text-muted" style="font-size: 12px">{{ row.group?.name ?? '' }}</p></template>
          <template #cell-paidAt="{ value }">{{ dateTime(value) }}</template>
          <template #cell-amount="{ value }"><span class="mono fw-600">{{ money(value) }}</span></template>
          <template #cell-method="{ value }">{{ t(`status.${value}`) }}</template>
          <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        </AppTable>
        <AppPagination v-model:page="paymentsList.page.value" v-model:limit="paymentsList.limit.value" :total-pages="paymentsList.totalPages.value" :total="paymentsList.total.value" />
      </AppCard>
      <StudentFormModal v-model:open="formOpen" :student="student" @saved="run" />
      <PaymentFormModal v-model:open="paymentOpen" :student="student" @saved="afterSave" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.profile-head {
  display: flex;
  gap: $space-4;
  align-items: center;
  margin-bottom: $space-5;
}

.details {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: $space-2 $space-4;
  margin: 0;
  font-size: 14px;

  dt {
    color: $color-text-muted;
  }

  dd {
    margin: 0;
  }

  @include down($bp-sm) {
    grid-template-columns: 1fr;
  }
}

.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.simple-list {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $space-3;
    padding: 12px $space-5;
    border-top: 1px solid $color-border;
    font-size: 14px;
  }
}
</style>
