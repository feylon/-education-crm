<script setup lang="ts">
import { reportsApi } from '@/api/reports.api';
import type { AttendanceReport, RevenueReport } from '@/api/types';
import BarChart from '@/components/charts/BarChart.vue';
import DoughnutChart from '@/components/charts/DoughnutChart.vue';
import LineChart from '@/components/charts/LineChart.vue';
import { AppButton, AppCard, AppFormField, AppInput, AppLoading, AppPageHeader, AppSelect, AppStat, AppTable, type TableColumn } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { firstOfMonthIso, todayIso, useFormatters } from '@/composables/useFormatters';
import { useToast } from '@/composables/useToast';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { money, percent, monthLabel, date } = useFormatters();
const toast = useToast();

const filters = reactive({ from: firstOfMonthIso(-11), to: todayIso(), groupBy: 'month' as 'day' | 'month' });
const revenue = ref<RevenueReport | null>(null);
const attendance = ref<AttendanceReport | null>(null);
const loading = ref(false);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    [revenue.value, attendance.value] = await Promise.all([reportsApi.revenue(filters), reportsApi.attendance(filters)]);
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const label = (period: string): string => (filters.groupBy === 'month' ? monthLabel(period) : date(period));
const revenueLabels = computed(() => revenue.value?.series.map((point) => label(point.period)) ?? []);
const attendanceLabels = computed(() => attendance.value?.series.map((point) => label(point.period)) ?? []);

const groupColumns: TableColumn[] = [
  { key: 'groupName', label: t('groups.title') },
  { key: 'total', label: t('reports.total'), align: 'right' },
];
const attendanceColumns: TableColumn[] = [
  { key: 'groupName', label: t('groups.title') },
  { key: 'rate', label: t('lessons.rate'), align: 'right' },
  { key: 'present', label: t('lessons.present'), align: 'right', hideBelow: 'md' },
  { key: 'absent', label: t('lessons.absent'), align: 'right', hideBelow: 'md' },
];
const attendanceRows = computed(() => attendance.value?.byGroup.map((row) => ({ id: row.groupId, groupName: row.groupName, rate: row.summary.attendanceRate, present: row.summary.present, absent: row.summary.absent })) ?? []);
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('reports.title')" :subtitle="t('reports.subtitle')" />
    <AppCard>
      <div class="toolbar">
        <AppFormField :label="t('common.from')"><AppInput v-model="filters.from" type="date" /></AppFormField>
        <AppFormField :label="t('common.to')"><AppInput v-model="filters.to" type="date" /></AppFormField>
        <AppFormField :label="t('reports.groupBy')">
          <AppSelect v-model="filters.groupBy" :clearable="false" :options="[{ value: 'month', label: t('common.month') }, { value: 'day', label: t('common.day') }]" />
        </AppFormField>
        <AppButton icon="refresh" :loading="loading" style="align-self: flex-end" @click="load">{{ t('common.refresh') }}</AppButton>
      </div>
    </AppCard>
    <AppLoading v-if="loading && !revenue" />
    <template v-else-if="revenue && attendance">
      <div class="grid grid-3">
        <AppStat :label="t('reports.total')" :value="money(revenue.total)" icon="money" tone="primary" />
        <AppStat :label="t('reports.paymentsCount')" :value="revenue.count" icon="payments" tone="info" />
        <AppStat :label="t('reports.averageRate')" :value="percent(attendance.summary.attendanceRate)" icon="attendance" tone="success" />
      </div>
      <div class="grid grid-2">
        <AppCard :title="`${t('reports.revenue')} · ${t('reports.series')}`">
          <LineChart :labels="revenueLabels" :datasets="[{ label: t('reports.revenue'), data: revenue.series.map((p) => p.value) }]" :formatter="money" />
        </AppCard>
        <AppCard :title="`${t('reports.attendance')} · ${t('reports.series')}`">
          <LineChart :labels="attendanceLabels" :datasets="[{ label: t('lessons.rate'), data: attendance.series.map((p) => p.summary.attendanceRate), color: '#059669' }]" :formatter="percent" :suggested-max="100" />
        </AppCard>
      </div>
      <div class="grid grid-3">
        <AppCard :title="t('reports.byMethod')">
          <DoughnutChart :labels="revenue.byMethod.map((m) => t(`status.${m.method}`))" :values="revenue.byMethod.map((m) => m.total)" :formatter="money" />
        </AppCard>
        <AppCard :title="`${t('reports.revenue')} · ${t('reports.byGroup')}`" flush>
          <AppTable :columns="groupColumns" :rows="revenue.byGroup.map((g) => ({ id: g.groupId, ...g }))" dense>
            <template #cell-total="{ value }">{{ money(value) }}</template>
          </AppTable>
        </AppCard>
        <AppCard :title="`${t('reports.attendance')} · ${t('reports.byGroup')}`" flush>
          <AppTable :columns="attendanceColumns" :rows="attendanceRows" dense>
            <template #cell-rate="{ value }">{{ percent(value) }}</template>
          </AppTable>
        </AppCard>
      </div>
      <AppCard :title="t('reports.byGroup')">
        <BarChart :labels="revenue.byGroup.map((g) => g.groupName)" :datasets="[{ label: t('reports.revenue'), data: revenue.byGroup.map((g) => g.total) }]" :formatter="money" />
      </AppCard>
    </template>
  </div>
</template>
