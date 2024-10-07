<script setup lang="ts">
import { teachersApi } from '@/api/teachers.api';
import type { Group, TeacherProfile } from '@/api/types';
import { AppAvatar, AppBadge, AppButton, AppCard, AppErrorState, AppLoading, AppPageHeader, AppStat, AppTable, StatusBadge, type TableColumn } from '@/components/ui';
import { useAsync } from '@/composables/useAsync';
import { useFormatters } from '@/composables/useFormatters';
import { usePermissions } from '@/composables/usePermissions';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import TeacherFormModal from './TeacherFormModal.vue';
import TeacherSchedulePanel from './TeacherSchedulePanel.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { can } = usePermissions();
const { money, percent, date, dateTime } = useFormatters();

const teacherId = computed(() => String(route.params.id));
const { data: profile, loading, error, run } = useAsync<TeacherProfile>(() => teachersApi.profile(teacherId.value));
watch(teacherId, () => void run());

const formOpen = ref(false);
const groupColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('groups.title') },
  { key: 'course', label: t('groups.course'), hideBelow: 'md' },
  { key: 'room', label: t('groups.room'), hideBelow: 'lg' },
  { key: 'startDate', label: t('groups.startDate'), hideBelow: 'md' },
  { key: 'monthlyFee', label: t('groups.monthlyFee'), align: 'right', hideBelow: 'lg' },
  { key: 'status', label: t('common.status') },
]);
const openGroup = (group: Group): void => void router.push({ name: 'group-detail', params: { id: group.id } });
</script>

<template>
  <div class="page">
    <AppLoading v-if="loading && !profile" />
    <AppErrorState v-else-if="error" :message="error" @retry="run" />
    <template v-else-if="profile">
      <AppPageHeader :title="`${profile.teacher.lastName} ${profile.teacher.firstName}`" :subtitle="profile.teacher.specialization ?? ''">
        <template #actions>
          <AppButton v-if="can('teachers.update')" variant="outline" icon="edit" @click="formOpen = true">{{ t('common.edit') }}</AppButton>
        </template>
      </AppPageHeader>
      <div class="grid grid-4">
        <AppStat :label="t('teachers.activeGroups')" :value="profile.statistics.activeGroups" icon="groups" tone="primary" />
        <AppStat :label="t('teachers.students')" :value="profile.statistics.students" icon="students" tone="info" />
        <AppStat :label="t('teachers.lessonsMonth')" :value="profile.statistics.lessonsThisMonth" :hint="`${t('teachers.lessonsTotal')}: ${profile.statistics.lessonsTotal}`" icon="lessons" tone="purple" />
        <AppStat :label="t('teachers.attendanceRate')" :value="percent(profile.statistics.attendance.attendanceRate)" icon="attendance" tone="success" />
      </div>
      <div class="grid grid-2">
        <AppCard :title="t('teachers.profile')">
          <div class="head">
            <AppAvatar :src="profile.teacher.photoUrl" :name="`${profile.teacher.firstName} ${profile.teacher.lastName}`" :size="72" />
            <div>
              <h2>{{ profile.teacher.lastName }} {{ profile.teacher.firstName }}</h2>
              <div class="flex gap-2 mt-2 flex-wrap">
                <StatusBadge :status="profile.teacher.status" />
                <AppBadge v-if="profile.teacher.specialization" variant="purple">{{ profile.teacher.specialization }}</AppBadge>
              </div>
            </div>
          </div>
          <dl class="details">
            <dt>{{ t('common.email') }}</dt><dd>{{ profile.teacher.user?.email ?? '—' }}</dd>
            <dt>{{ t('common.phone') }}</dt><dd>{{ profile.teacher.phone }}</dd>
            <dt>{{ t('teachers.hireDate') }}</dt><dd>{{ date(profile.teacher.hireDate) }}</dd>
            <dt>{{ t('teachers.salary') }}</dt><dd>{{ t(`status.${profile.teacher.salaryType}`) }} · {{ profile.teacher.salaryType === 'PERCENT' ? `${profile.teacher.salaryAmount}%` : money(profile.teacher.salaryAmount) }}</dd>
            <dt>{{ t('students.branch') }}</dt><dd>{{ profile.teacher.branch?.name ?? '—' }}</dd>
            <dt>{{ t('common.createdAt') }}</dt><dd>{{ dateTime(profile.teacher.createdAt) }}</dd>
            <dt v-if="profile.teacher.bio">{{ t('teachers.bio') }}</dt><dd v-if="profile.teacher.bio">{{ profile.teacher.bio }}</dd>
          </dl>
        </AppCard>
        <TeacherSchedulePanel :schedule="profile.schedule" />
      </div>
      <AppCard :title="t('teachers.groups')" flush>
        <AppTable :columns="groupColumns" :rows="profile.groups" clickable @row-click="openGroup">
          <template #cell-name="{ value }"><span class="fw-600">{{ value }}</span></template>
          <template #cell-course="{ row }">{{ row.course?.name ?? '—' }}</template>
          <template #cell-room="{ row }">{{ row.room?.name ?? '—' }}</template>
          <template #cell-startDate="{ value }">{{ date(value) }}</template>
          <template #cell-monthlyFee="{ value }"><span class="mono">{{ money(value) }}</span></template>
          <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
        </AppTable>
      </AppCard>
      <TeacherFormModal v-model:open="formOpen" :teacher="profile.teacher" @saved="run" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.head {
  display: flex;
  gap: $space-4;
  align-items: center;
  margin-bottom: $space-5;
}

.details {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: $space-2 $space-4;
  margin: 0;

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
</style>
