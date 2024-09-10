import { authApi } from '@/api/auth.api';
import { registerSessionExpiredHandler, tokenStorage } from '@/api/http';
import type { AuthUser } from '@/api/types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const initialized = ref(false);
  const loading = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const roles = computed(() => user.value?.roles ?? []);
  const permissions = computed(() => new Set(user.value?.permissions ?? []));
  const isSuperAdmin = computed(() => roles.value.includes('SUPER_ADMIN'));
  const isStaff = computed(() => roles.value.some((role) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER'].includes(role)));
  const isTeacherOnly = computed(() => !isStaff.value && roles.value.includes('TEACHER'));
  const isStudentOnly = computed(() => !isStaff.value && !roles.value.includes('TEACHER') && roles.value.includes('STUDENT'));
  const fullName = computed(() => (user.value ? `${user.value.firstName} ${user.value.lastName}` : ''));

  const hasPermission = (...codes: string[]): boolean => isSuperAdmin.value || codes.every((code) => permissions.value.has(code));
  const hasAnyPermission = (...codes: string[]): boolean => isSuperAdmin.value || codes.some((code) => permissions.value.has(code));
  const hasRole = (...names: string[]): boolean => names.some((name) => roles.value.includes(name));

  const login = async (email: string, password: string): Promise<void> => {
    loading.value = true;
    try {
      const result = await authApi.login(email, password);
      tokenStorage.set(result);
      user.value = result.user;
    } finally {
      loading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    const refreshToken = tokenStorage.refresh;
    try {
      if (tokenStorage.access) {
        await authApi.logout(refreshToken);
      }
    } catch {
      /* token may already be invalid */
    } finally {
      tokenStorage.clear();
      user.value = null;
    }
  };

  const restore = async (): Promise<void> => {
    if (initialized.value) {
      return;
    }
    if (tokenStorage.access || tokenStorage.refresh) {
      try {
        user.value = await authApi.me();
      } catch {
        tokenStorage.clear();
        user.value = null;
      }
    }
    initialized.value = true;
  };

  const refreshProfile = async (): Promise<void> => {
    user.value = await authApi.me();
  };

  const expire = (): void => {
    tokenStorage.clear();
    user.value = null;
  };

  registerSessionExpiredHandler(expire);

  return {
    user,
    initialized,
    loading,
    isAuthenticated,
    roles,
    isSuperAdmin,
    isStaff,
    isTeacherOnly,
    isStudentOnly,
    fullName,
    hasPermission,
    hasAnyPermission,
    hasRole,
    login,
    logout,
    restore,
    refreshProfile,
    expire,
  };
});
