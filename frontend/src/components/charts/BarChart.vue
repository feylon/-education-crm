<script setup lang="ts">
import { computed } from 'vue';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'vue-chartjs';
import { CHART_COLORS, registerCharts } from './chart.config';

const props = withDefaults(
  defineProps<{ labels: string[]; datasets: Array<{ label: string; data: number[]; color?: string }>; height?: number; horizontal?: boolean; formatter?: (value: number) => string }>(),
  { height: 260, horizontal: false },
);
registerCharts();

const data = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((dataset, index) => ({
    label: dataset.label,
    data: dataset.data,
    backgroundColor: dataset.color ?? CHART_COLORS[index % CHART_COLORS.length],
    borderRadius: 6,
    maxBarThickness: 36,
  })),
}));

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  indexAxis: props.horizontal ? ('y' as const) : ('x' as const),
  plugins: {
    legend: { display: props.datasets.length > 1, position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<'bar'>) => {
          const value = Number((props.horizontal ? context.parsed.x : context.parsed.y) ?? 0);
          return `${context.dataset.label ?? ''}: ${props.formatter ? props.formatter(value) : value}`;
        },
      },
    },
  },
  scales: {
    x: { grid: { display: props.horizontal, color: '#eef1f6' }, beginAtZero: true },
    y: { grid: { display: !props.horizontal, color: '#eef1f6' }, beginAtZero: true },
  },
}));
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Bar :data="data" :options="options" />
  </div>
</template>
