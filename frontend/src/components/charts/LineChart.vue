<script setup lang="ts">
import { computed } from 'vue';
import type { TooltipItem } from 'chart.js';
import { Line } from 'vue-chartjs';
import { CHART_COLORS, registerCharts, withAlpha } from './chart.config';

const props = withDefaults(
  defineProps<{ labels: string[]; datasets: Array<{ label: string; data: number[]; color?: string }>; height?: number; formatter?: (value: number) => string; suggestedMax?: number }>(),
  { height: 260 },
);
registerCharts();

const data = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((dataset, index) => {
    const color = dataset.color ?? CHART_COLORS[index % CHART_COLORS.length];
    return {
      label: dataset.label,
      data: dataset.data,
      borderColor: color,
      backgroundColor: withAlpha(color, 0.12),
      pointBackgroundColor: color,
      tension: 0.35,
      fill: true,
      borderWidth: 2,
      pointRadius: 3,
    };
  }),
}));

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: { display: props.datasets.length > 1, position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<'line'>) =>
          `${context.dataset.label ?? ''}: ${props.formatter ? props.formatter(Number(context.parsed.y ?? 0)) : context.parsed.y}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      beginAtZero: true,
      suggestedMax: props.suggestedMax,
      grid: { color: '#eef1f6' },
      ticks: { callback: (value: string | number) => (props.formatter ? props.formatter(Number(value)) : value) },
    },
  },
}));
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Line :data="data" :options="options" />
  </div>
</template>
