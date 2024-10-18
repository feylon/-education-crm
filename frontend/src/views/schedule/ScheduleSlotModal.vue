<script setup lang="ts">
import { groupsApi } from '@/api/groups.api';
import { schedulesApi, type SchedulePayload } from '@/api/schedules.api';
import type { ConflictReport, Group, Room, Schedule } from '@/api/types';
import { AppBadge, AppButton, AppFormField, AppInput, AppModal, AppSearchSelect, AppSelect } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { rules, useForm } from '@/composables/useForm';
import { useToast } from '@/composables/useToast';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ open: boolean; groupId?: string | null; scheduleId?: string | null; schedules?: Schedule[] }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>();
const { t } = useI18n();
const toast = useToast();

const rooms = ref<Room[]>([]);
onMounted(async () => {
  rooms.value = await schedulesApi.rooms().catch(() => []);
});

const form = useForm(
  { groupId: '' as string | null, roomId: '', weekday: 1 as number | string, startTime: '09:00', endTime: '10:30', effectiveFrom: '', effectiveTo: '' },
  {
    groupId: [rules.required(t('validation.required'))],
    weekday: [rules.required(t('validation.required'))],
    startTime: [rules.required(t('validation.required')), rules.time(t('validation.time'))],
    endTime: [rules.required(t('validation.required')), rules.time(t('validation.time'))],
  },
);
const groupLabel = ref('');
const conflicts = ref<ConflictReport | null>(null);
const checking = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    conflicts.value = null;
    const existing = props.scheduleId ? props.schedules?.find((slot) => slot.id === props.scheduleId) : null;
    form.reset(
      existing
        ? {
            groupId: existing.groupId,
            roomId: existing.roomId ?? '',
            weekday: existing.weekday,
            startTime: existing.startTime.slice(0, 5),
            endTime: existing.endTime.slice(0, 5),
            effectiveFrom: existing.effectiveFrom,
            effectiveTo: existing.effectiveTo ?? '',
          }
        : { groupId: props.groupId ?? '', roomId: '', weekday: 1, startTime: '09:00', endTime: '10:30', effectiveFrom: '', effectiveTo: '' },
    );
    groupLabel.value = existing?.group?.name ?? '';
  },
  { immediate: true },
);

const payload = (): SchedulePayload => ({
  groupId: form.values.groupId as string,
  roomId: form.values.roomId || undefined,
  weekday: Number(form.values.weekday),
  startTime: form.values.startTime,
  endTime: form.values.endTime,
  effectiveFrom: form.values.effectiveFrom || undefined,
  effectiveTo: form.values.effectiveTo || undefined,
});

const check = async (): Promise<void> => {
  if (!form.validate()) return;
  checking.value = true;
  try {
    conflicts.value = await schedulesApi.checkConflicts({ ...payload(), id: props.scheduleId ?? undefined });
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  } finally {
    checking.value = false;
  }
};

const save = async (): Promise<void> => {
  const ok = await form.submit(async () => {
    if (props.scheduleId) await schedulesApi.update(props.scheduleId, payload());
    else await schedulesApi.create(payload());
    toast.success(t('common.saved'));
    emit('saved');
    emit('update:open', false);
  });
  if (!ok && form.serverError.value) toast.error(t('schedule.conflicts'), form.serverError.value);
};

const conflictText = (conflict: ConflictReport['conflicts'][number]): string => {
  const params = { group: conflict.groupName ?? '', start: conflict.startTime ?? '', end: conflict.endTime ?? '' };
  if (conflict.kind === 'TEACHER') return t('schedule.conflictTeacher', params);
  if (conflict.kind === 'ROOM') return t('schedule.conflictRoom', params);
  return t('schedule.conflictGroup', params);
};

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7].map((day) => ({ value: day, label: t(`common.weekdays.${day}`) }));
const fetchGroups = (search: string): Promise<Group[]> => groupsApi.lookup(search);
</script>

<template>
  <AppModal :open="open" :title="scheduleId ? t('schedule.editSlot') : t('schedule.addSlot')" @update:open="emit('update:open', $event)">
    <form class="form-grid" novalidate @submit.prevent="save">
      <AppFormField :label="t('schedule.group')" :error="form.errors.groupId" required class="span-2">
        <AppSearchSelect v-model="form.values.groupId" :fetcher="fetchGroups" :label-of="(item: Group) => item.name" :hint-of="(item: Group) => item.course?.name ?? ''" :initial-label="groupLabel" :disabled="!!groupId || !!scheduleId" :invalid="!!form.errors.groupId" />
      </AppFormField>
      <AppFormField :label="t('schedule.weekday')" :error="form.errors.weekday" required><AppSelect v-model="form.values.weekday" :options="WEEKDAYS" :clearable="false" /></AppFormField>
      <AppFormField :label="t('schedule.room')"><AppSelect v-model="form.values.roomId" :options="rooms.map((room) => ({ value: room.id, label: room.name }))" :placeholder="t('groups.noRoom')" /></AppFormField>
      <AppFormField :label="t('schedule.startTime')" :error="form.errors.startTime" required><AppInput v-model="form.values.startTime" type="time" :invalid="!!form.errors.startTime" /></AppFormField>
      <AppFormField :label="t('schedule.endTime')" :error="form.errors.endTime" required><AppInput v-model="form.values.endTime" type="time" :invalid="!!form.errors.endTime" /></AppFormField>
      <AppFormField :label="t('schedule.effectiveFrom')"><AppInput v-model="form.values.effectiveFrom" type="date" /></AppFormField>
      <AppFormField :label="t('schedule.effectiveTo')"><AppInput v-model="form.values.effectiveTo" type="date" /></AppFormField>
      <div v-if="conflicts" class="span-2 conflicts" :class="{ 'conflicts--ok': !conflicts.hasConflicts }">
        <AppBadge :variant="conflicts.hasConflicts ? 'danger' : 'success'">{{ conflicts.hasConflicts ? t('schedule.conflicts') : t('schedule.noConflicts') }}</AppBadge>
        <ul v-if="conflicts.hasConflicts">
          <li v-for="(conflict, index) in conflicts.conflicts" :key="index">{{ conflictText(conflict) }}</li>
        </ul>
      </div>
    </form>
    <template #footer>
      <AppButton variant="outline" :loading="checking" @click="check">{{ t('schedule.checkConflicts') }}</AppButton>
      <AppButton variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</AppButton>
      <AppButton :loading="form.submitting.value" @click="save">{{ t('common.save') }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.conflicts {
  padding: $space-3;
  border-radius: $radius-md;
  background: $color-danger-soft;

  &--ok {
    background: $color-success-soft;
  }

  ul {
    margin: $space-2 0 0;
    padding-left: $space-5;
    font-size: 13px;
  }
}
</style>
