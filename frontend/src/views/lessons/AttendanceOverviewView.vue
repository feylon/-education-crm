<script setup lang="ts">
import { attendanceApi, type MonthlyPoint } from '@/api/attendance.api';
import { groupsApi } from '@/api/groups.api';
import type { AttendanceSummary, Group } from '@/api/types';
import BarChart from '@/components/charts/BarChart.vue';
import { AppCard, AppFormField, AppInput, AppLoading, AppPageHeader, AppSearchSelect, AppStat, AppTable, type TableColumn } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { useFormatters } from '@/composables/useFormatters';
import { useToast } from '@/composables/useToast';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const { percent, monthLabel } = useFormatters();

const year = ref(new Date().getFullYear());
const groupId = ref<string | null>(null);
const monthly = ref<MonthlyPoint[]>([]);
const groupStats = ref<(AttendanceSummary & { byStudent: Array<AttendanceSummary & { studentId: string; firstName: string; lastName: string }> }) | null>(null);
const loading = ref(false);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    monthly.value = await attendanceApi.monthly(year.value, groupId.value ?? undefined);
    groupStats.value = groupId.value ? await attendanceApi.groupStats(groupId.value) : null;
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  } finally {
    loading.value = false;
  }
};
watch([year, groupId], load, { immediate: true });

const totals = computed(() => {
  const sum = { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
  for (const point of monthly.value) {
    sum.total += point.summary.total;
    sum.present += point.summary.present;
    sum.absent += point.summary.absent;
    sum.late += point.summary.late;
    sum.excused += point.summary.excused;
  }
  return { ...sum, rate: sum.total ? Math.round(((sum.present + sum.late) / sum.total) * 1000) / 10 : 0 };
});

const studentColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('groups.student') },
  { key: 'attendanceRate', label: t('lessons.rate'), align: 'right' },
  { key: 'present', label: t('lessons.present'), align: 'right', hideBelow: 'md' },
  { key: 'late', label: t('lessons.late'), align: 'right', hideBelow: 'md' },
  { key: 'absent', label: t('lessons.absent'), align: 'right', hideBelow: 'md' },
  { key: 'excused', label: t('lessons.excused'), align: 'right', hideBelow: 'lg' },
]);
const fetchGroups = (search: string): Promise<Group[]> => groupsApi.lookup(search);
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('lessons.statistics')" :subtitle="t('lessons.monthly')" />
    <AppCard>
      <div class="toolbar">
        <AppFormField :label="t('common.year')"><AppInput v-model="year" type="number" min="2020" max="2100" style="width: 120px" /></AppFormField>
        <AppFormField :label="t('lessons.group')" class="grow" style="max-width: 300px">
          <AppSearchSelect v-model="groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :placeholder="t('lessons.allGroups')" />
        </AppFormField>
      </div>
    </AppCard>
    <AppLoading v-if="loading && monthly.length === 0" />
    <template v-else>
      <div class="grid grid-4">
        <AppStat :label="t('lessons.rate')" :value="percent(totals.rate)" icon="attendance" tone="success" />
        <AppStat :label="t('lessons.present')" :value="totals.present" icon="check" tone="primary" />
        <AppStat :label="t('lessons.late')" :value="totals.late" icon="clock" tone="warning" />
        <AppStat :label="t('lessons.absent')" :value="totals.absent" :hint="`${t('lessons.excused')}: ${totals.excused}`" icon="x" tone="danger" />
      </div>
      <AppCard :title="t('lessons.monthly')">
        <BarChart
          :labels="monthly.map((point) => monthLabel(point.month))"
          :datasets="[
            { label: t('lessons.present'), data: monthly.map((point) => point.summary.present), color: '#059669' },
            { label: t('lessons.late'), data: monthly.map((point) => point.summary.late), color: '#d97706' },
            { label: t('lessons.absent'), data: monthly.map((point) => point.summary.absent), color: '#dc2626' },
            { label: t('lessons.excused'), data: monthly.map((point) => point.summary.excused), color: '#0891b2' },
          ]"
          :height="300"
        />
      </AppCard>
      <AppCard v-if="groupStats" :title="t('lessons.byStudent')" flush>
        <AppTable :columns="studentColumns" :rows="groupStats.byStudent.map((row) => ({ id: row.studentId, ...row }))" dense>
          <template #cell-name="{ row }">{{ row.lastName }} {{ row.firstName }}</template>
          <template #cell-attendanceRate="{ value }"><span class="fw-600" :class="value < 70 ? 'text-danger' : 'text-success'">{{ percent(value) }}</span></template>
        </AppTable>
      </AppCard>
    </template>
  </div>
</template>
