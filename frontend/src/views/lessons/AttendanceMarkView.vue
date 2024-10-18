<script setup lang="ts">
import { attendanceApi } from '@/api/attendance.api';
import type { AttendanceStatus, LessonSheet } from '@/api/types';
import { AppAvatar, AppBadge, AppButton, AppCard, AppEmpty, AppErrorState, AppFormField, AppInput, AppLoading, AppPageHeader, StatusBadge } from '@/components/ui';
import { errorMessage, useAsync } from '@/composables/useAsync';
import { useFormatters } from '@/composables/useFormatters';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { can } = usePermissions();
const { date, time } = useFormatters();

const lessonId = computed(() => String(route.params.id));
const { data: sheet, loading, error, run } = useAsync<LessonSheet>(() => attendanceApi.sheet(lessonId.value));

const marks = reactive<Record<string, AttendanceStatus | null>>({});
const notes = reactive<Record<string, string>>({});
const topic = ref('');
const saving = ref(false);

watch(
  sheet,
  (value) => {
    if (!value) return;
    for (const row of value.rows) {
      marks[row.studentId] = row.status;
      notes[row.studentId] = row.note ?? '';
    }
    topic.value = value.lesson.topic ?? '';
  },
  { immediate: true },
);

const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];
const summary = computed(() => {
  const counts: Record<AttendanceStatus, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  for (const status of Object.values(marks)) if (status) counts[status] += 1;
  return counts;
});
const markedCount = computed(() => Object.values(marks).filter(Boolean).length);
const canMark = computed(() => can('attendance.mark') && sheet.value?.lesson.status !== 'CANCELLED');

const markAll = (status: AttendanceStatus): void => {
  for (const row of sheet.value?.rows ?? []) marks[row.studentId] = status;
};

const save = async (): Promise<void> => {
  const records = Object.entries(marks)
    .filter((entry): entry is [string, AttendanceStatus] => entry[1] !== null)
    .map(([studentId, status]) => ({ studentId, status, note: notes[studentId]?.trim() || undefined }));
  if (records.length === 0) return;
  saving.value = true;
  try {
    await attendanceApi.mark(lessonId.value, { records, topic: topic.value.trim() || undefined });
    toast.success(t('lessons.attendanceSaved'));
    await run();
  } catch (caught) {
    toast.error(t('common.errorTitle'), errorMessage(caught));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="page">
    <AppLoading v-if="loading && !sheet" />
    <AppErrorState v-else-if="error" :message="error" @retry="run" />
    <template v-else-if="sheet">
      <AppPageHeader :title="t('lessons.attendanceFor', { group: sheet.lesson.group?.name ?? '', date: date(sheet.lesson.date) })" :subtitle="`${time(sheet.lesson.startTime)}–${time(sheet.lesson.endTime)} · ${sheet.lesson.room?.name ?? ''} · ${sheet.lesson.teacher ? `${sheet.lesson.teacher.lastName} ${sheet.lesson.teacher.firstName}` : ''}`">
        <template #actions>
          <StatusBadge :status="sheet.lesson.status" />
          <RouterLink :to="{ name: 'group-detail', params: { id: sheet.lesson.groupId } }"><AppButton variant="outline" icon="groups">{{ t('groups.title') }}</AppButton></RouterLink>
        </template>
      </AppPageHeader>
      <AppCard>
        <div class="toolbar">
          <AppFormField :label="t('lessons.topic')" class="grow"><AppInput v-model="topic" :disabled="!canMark" :placeholder="t('lessons.topic')" /></AppFormField>
          <div v-if="canMark" class="quick">
            <span class="text-muted">{{ t('lessons.markAll') }}:</span>
            <AppButton v-for="status in STATUSES" :key="status" size="sm" variant="outline" @click="markAll(status)">{{ t(`status.${status}`) }}</AppButton>
          </div>
        </div>
        <div class="summary">
          <AppBadge variant="success">{{ t('lessons.present') }}: {{ summary.PRESENT }}</AppBadge>
          <AppBadge variant="warning">{{ t('lessons.late') }}: {{ summary.LATE }}</AppBadge>
          <AppBadge variant="danger">{{ t('lessons.absent') }}: {{ summary.ABSENT }}</AppBadge>
          <AppBadge variant="info">{{ t('lessons.excused') }}: {{ summary.EXCUSED }}</AppBadge>
          <span class="text-muted">{{ markedCount }} / {{ sheet.rows.length }}</span>
        </div>
      </AppCard>
      <AppCard flush>
        <AppEmpty v-if="sheet.rows.length === 0" :title="t('lessons.noStudents')" icon="students" />
        <ul v-else class="roster">
          <li v-for="row in sheet.rows" :key="row.studentId" class="roster__item">
            <div class="roster__student">
              <AppAvatar :src="row.photoUrl" :name="`${row.firstName} ${row.lastName}`" :size="38" />
              <div>
                <p class="fw-600">{{ row.lastName }} {{ row.firstName }}</p>
                <p class="text-muted" style="font-size: 12px">{{ row.phone }} <AppBadge v-if="row.enrollmentStatus !== 'ACTIVE'" size="sm">{{ t(`status.${row.enrollmentStatus}`) }}</AppBadge></p>
              </div>
            </div>
            <div class="roster__marks">
              <button v-for="status in STATUSES" :key="status" type="button" class="mark" :class="[`mark--${status.toLowerCase()}`, { 'mark--active': marks[row.studentId] === status }]" :disabled="!canMark" @click="marks[row.studentId] = status">
                {{ t(`status.${status}`) }}
              </button>
            </div>
            <div class="roster__note"><AppInput v-model="notes[row.studentId]" :placeholder="t('lessons.note')" :disabled="!canMark" /></div>
          </li>
        </ul>
        <template v-if="canMark && sheet.rows.length" #footer>
          <div class="flex justify-between items-center">
            <span class="text-muted">{{ markedCount }} / {{ sheet.rows.length }}</span>
            <AppButton :loading="saving" :disabled="markedCount === 0" icon="check" @click="save">{{ t('lessons.saveAttendance') }}</AppButton>
          </div>
        </template>
      </AppCard>
    </template>
  </div>
</template>

<style scoped lang="scss">
.quick {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-wrap: wrap;
  align-self: flex-end;
  padding-bottom: 2px;
}

.summary {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
  align-items: center;
  margin-top: $space-4;
}

.roster {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item {
    display: grid;
    grid-template-columns: minmax(200px, 1.2fr) auto minmax(160px, 1fr);
    gap: $space-4;
    align-items: center;
    padding: 12px $space-5;
    border-top: 1px solid $color-border;

    @include down($bp-lg) {
      grid-template-columns: 1fr;
      gap: $space-2;
    }
  }

  &__student {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  &__marks {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
}

.mark {
  padding: 6px 12px;
  border: 1px solid $color-border-strong;
  border-radius: $radius-full;
  background: $color-surface;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: $color-text-muted;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  &--active.mark--present {
    background: $color-success;
    border-color: $color-success;
    color: #fff;
  }

  &--active.mark--late {
    background: $color-warning;
    border-color: $color-warning;
    color: #fff;
  }

  &--active.mark--absent {
    background: $color-danger;
    border-color: $color-danger;
    color: #fff;
  }

  &--active.mark--excused {
    background: $color-info;
    border-color: $color-info;
    color: #fff;
  }
}
</style>
