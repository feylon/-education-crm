<script setup lang="ts">
import { schedulesApi, type BranchPayload, type RoomPayload } from '@/api/schedules.api';
import type { Branch, Room } from '@/api/types';
import { AppBadge, AppButton, AppCard, AppEmpty, AppFormField, AppInput, AppLoading, AppModal, AppPageHeader, AppSelect, AppSwitch } from '@/components/ui';
import { errorMessage } from '@/composables/useAsync';
import { useConfirm } from '@/composables/useConfirm';
import { rules, useForm } from '@/composables/useForm';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const toast = useToast();
const { confirm } = useConfirm();
const { can } = usePermissions();

const branches = ref<Branch[]>([]);
const rooms = ref<Room[]>([]);
const loading = ref(true);
const activeBranch = ref<string | null>(null);
const load = async (): Promise<void> => {
  loading.value = true;
  try {
    [branches.value, rooms.value] = await Promise.all([schedulesApi.branches(), schedulesApi.rooms()]);
    if (!activeBranch.value && branches.value.length) activeBranch.value = branches.value[0].id;
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  } finally {
    loading.value = false;
  }
};
onMounted(load);
const visibleRooms = computed(() => rooms.value.filter((room) => !activeBranch.value || room.branchId === activeBranch.value));

const branchOpen = ref(false);
const editingBranch = ref<Branch | null>(null);
const branchForm = useForm({ name: '', address: '', phone: '', isActive: true }, { name: [rules.required(t('validation.required'))] });
const openBranch = (branch: Branch | null): void => {
  editingBranch.value = branch;
  branchForm.reset(branch ? { name: branch.name, address: branch.address ?? '', phone: branch.phone ?? '', isActive: branch.isActive } : undefined);
  branchOpen.value = true;
};
const saveBranch = async (): Promise<void> => {
  const ok = await branchForm.submit(async (values) => {
    const payload: BranchPayload = { name: values.name.trim(), address: values.address.trim() || undefined, phone: values.phone.trim() || undefined, isActive: values.isActive };
    if (editingBranch.value) await schedulesApi.updateBranch(editingBranch.value.id, payload);
    else await schedulesApi.createBranch(payload);
    toast.success(t('common.saved'));
  });
  if (ok) {
    branchOpen.value = false;
    await load();
  } else if (branchForm.serverError.value) toast.error(t('common.errorTitle'), branchForm.serverError.value);
};
const removeBranch = async (branch: Branch): Promise<void> => {
  if (!(await confirm({ title: t('common.confirmDeleteTitle'), message: t('branches.deleteBranchConfirm', { name: branch.name }), danger: true, confirmText: t('common.delete') }))) return;
  try {
    await schedulesApi.removeBranch(branch.id);
    toast.success(t('common.deleted'));
    if (activeBranch.value === branch.id) activeBranch.value = null;
    await load();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};

const roomOpen = ref(false);
const editingRoom = ref<Room | null>(null);
const roomForm = useForm({ branchId: '', name: '', capacity: 12 as number | string, isActive: true }, { branchId: [rules.required(t('validation.required'))], name: [rules.required(t('validation.required'))], capacity: [rules.min(1, t('validation.min', { n: 1 }))] });
const openRoom = (room: Room | null): void => {
  editingRoom.value = room;
  roomForm.reset(room ? { branchId: room.branchId, name: room.name, capacity: room.capacity, isActive: room.isActive } : { branchId: activeBranch.value ?? '', name: '', capacity: 12, isActive: true });
  roomOpen.value = true;
};
const saveRoom = async (): Promise<void> => {
  const ok = await roomForm.submit(async (values) => {
    const payload: RoomPayload = { branchId: values.branchId, name: values.name.trim(), capacity: Number(values.capacity), isActive: values.isActive };
    if (editingRoom.value) await schedulesApi.updateRoom(editingRoom.value.id, payload);
    else await schedulesApi.createRoom(payload);
    toast.success(t('common.saved'));
  });
  if (ok) {
    roomOpen.value = false;
    await load();
  } else if (roomForm.serverError.value) toast.error(t('common.errorTitle'), roomForm.serverError.value);
};
const removeRoom = async (room: Room): Promise<void> => {
  if (!(await confirm({ title: t('common.confirmDeleteTitle'), message: t('branches.deleteRoomConfirm', { name: room.name }), danger: true, confirmText: t('common.delete') }))) return;
  try {
    await schedulesApi.removeRoom(room.id);
    toast.success(t('common.deleted'));
    await load();
  } catch (error) {
    toast.error(t('common.errorTitle'), errorMessage(error));
  }
};
</script>

<template>
  <div class="page">
    <AppPageHeader :title="t('branches.title')" :subtitle="t('branches.subtitle')">
      <template #actions>
        <AppButton v-if="can('branches.create')" variant="outline" icon="plus" @click="openBranch(null)">{{ t('branches.addBranch') }}</AppButton>
        <AppButton v-if="can('rooms.create')" icon="plus" :disabled="branches.length === 0" @click="openRoom(null)">{{ t('branches.addRoom') }}</AppButton>
      </template>
    </AppPageHeader>
    <AppLoading v-if="loading && branches.length === 0" />
    <div v-else class="layout">
      <AppCard :title="t('branches.branches')" flush>
        <AppEmpty v-if="branches.length === 0" :title="t('common.noData')" icon="branches" />
        <ul v-else class="items">
          <li v-for="branch in branches" :key="branch.id" class="items__row" :class="{ 'items__row--active': branch.id === activeBranch }" @click="activeBranch = branch.id">
            <div>
              <p class="fw-600 flex items-center gap-2">{{ branch.name }} <AppBadge v-if="!branch.isActive" size="sm">{{ t('users.inactive') }}</AppBadge></p>
              <p class="text-muted" style="font-size: 12px">{{ branch.address ?? '' }} {{ branch.phone ? `· ${branch.phone}` : '' }} · {{ t('branches.roomsCount', { n: branch.roomsCount ?? 0 }) }}</p>
            </div>
            <div class="flex gap-1" @click.stop>
              <AppButton v-if="can('branches.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openBranch(branch)" />
              <AppButton v-if="can('branches.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="removeBranch(branch)" />
            </div>
          </li>
        </ul>
      </AppCard>
      <AppCard :title="t('branches.rooms')" flush>
        <AppEmpty v-if="visibleRooms.length === 0" :title="t('common.noData')" icon="branches" />
        <ul v-else class="items">
          <li v-for="room in visibleRooms" :key="room.id" class="items__row">
            <div>
              <p class="fw-600 flex items-center gap-2">{{ room.name }} <AppBadge v-if="!room.isActive" size="sm">{{ t('users.inactive') }}</AppBadge></p>
              <p class="text-muted" style="font-size: 12px">{{ room.branch?.name }} · {{ t('branches.capacity') }}: {{ room.capacity }}</p>
            </div>
            <div class="flex gap-1">
              <AppButton v-if="can('rooms.update')" variant="ghost" size="sm" icon="edit" icon-only @click="openRoom(room)" />
              <AppButton v-if="can('rooms.delete')" variant="ghost" size="sm" icon="trash" icon-only @click="removeRoom(room)" />
            </div>
          </li>
        </ul>
      </AppCard>
    </div>
    <AppModal v-model:open="branchOpen" :title="editingBranch ? t('branches.editBranch') : t('branches.addBranch')" size="sm">
      <div class="flex-col">
        <AppFormField :label="t('common.name')" :error="branchForm.errors.name" required><AppInput v-model="branchForm.values.name" :invalid="!!branchForm.errors.name" /></AppFormField>
        <AppFormField :label="t('common.address')"><AppInput v-model="branchForm.values.address" /></AppFormField>
        <AppFormField :label="t('common.phone')"><AppInput v-model="branchForm.values.phone" /></AppFormField>
        <AppSwitch v-model="branchForm.values.isActive" :label="t('branches.isActive')" />
      </div>
      <template #footer>
        <AppButton variant="outline" @click="branchOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="branchForm.submitting.value" @click="saveBranch">{{ t('common.save') }}</AppButton>
      </template>
    </AppModal>
    <AppModal v-model:open="roomOpen" :title="editingRoom ? t('branches.editRoom') : t('branches.addRoom')" size="sm">
      <div class="flex-col">
        <AppFormField :label="t('branches.branch')" :error="roomForm.errors.branchId" required><AppSelect v-model="roomForm.values.branchId" :options="branches.map((branch) => ({ value: branch.id, label: branch.name }))" :clearable="false" /></AppFormField>
        <AppFormField :label="t('common.name')" :error="roomForm.errors.name" required><AppInput v-model="roomForm.values.name" :invalid="!!roomForm.errors.name" /></AppFormField>
        <AppFormField :label="t('branches.capacity')" :error="roomForm.errors.capacity"><AppInput v-model="roomForm.values.capacity" type="number" min="1" /></AppFormField>
        <AppSwitch v-model="roomForm.values.isActive" :label="t('branches.isActive')" />
      </div>
      <template #footer>
        <AppButton variant="outline" @click="roomOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton :loading="roomForm.submitting.value" @click="saveRoom">{{ t('common.save') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: $space-4;
  align-items: start;

  @include down($bp-lg) {
    grid-template-columns: 1fr;
  }
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;

  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $space-3;
    padding: 12px $space-5;
    border-top: 1px solid $color-border;
    cursor: pointer;

    &:hover {
      background: #f8fafc;
    }

    &--active {
      background: $color-primary-soft;
    }
  }
}

.flex-col {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
</style>
