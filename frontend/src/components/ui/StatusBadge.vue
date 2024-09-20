<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppBadge from './AppBadge.vue';

const props = defineProps<{ status: string | null | undefined }>();
const { t, te } = useI18n();

const VARIANTS: Record<string, 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
  ACTIVE: 'success',
  PAID: 'success',
  PRESENT: 'success',
  COMPLETED: 'primary',
  GRADUATED: 'primary',
  PLANNED: 'info',
  PENDING: 'warning',
  PARTIALLY_PAID: 'warning',
  LATE: 'warning',
  PAUSED: 'warning',
  ON_LEAVE: 'warning',
  OVERDUE: 'danger',
  ABSENT: 'danger',
  CANCELLED: 'danger',
  DROPPED: 'danger',
  TERMINATED: 'danger',
  INACTIVE: 'neutral',
  LEFT: 'neutral',
  REFUNDED: 'purple',
  EXCUSED: 'info',
};

const variant = computed(() => (props.status ? VARIANTS[props.status] ?? 'neutral' : 'neutral'));
const label = computed(() => (props.status ? (te(`status.${props.status}`) ? t(`status.${props.status}`) : props.status) : '—'));
</script>

<template>
  <AppBadge :variant="variant" dot>{{ label }}</AppBadge>
</template>
