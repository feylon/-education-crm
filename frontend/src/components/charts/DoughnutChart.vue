<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { CHART_COLORS, registerCharts } from './chart.config';

const props = withDefaults(defineProps<{ labels: string[]; values: number[]; colors?: string[]; height?: number; formatter?: (value: number) => string }>(), {
  height: 240,
});
registerCharts();

const data = computed(() => ({
  labels: props.labels,
  datasets: [{ data: props.values, backgroundColor: props.colors ?? CHART_COLORS, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
}));

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  cutout: '62%',
  plugins: {
    legend: { position: 'right' as const, labels: { boxWidth: 12, usePointStyle: true } },
    tooltip: {
      callbacks: {
        label: (context: { label: string; parsed: number }) => `${context.label}: ${props.formatter ? props.formatter(context.parsed) : context.parsed}`,
      },
    },
  },
}));
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Doughnut :data="data" :options="options" />
  </div>
</template>
