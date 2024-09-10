import { useAuthStore } from '@/stores/auth.store';

export const usePermissions = () => {
  const auth = useAuthStore();
  return {
    can: (...codes: string[]) => auth.hasPermission(...codes),
    canAny: (...codes: string[]) => auth.hasAnyPermission(...codes),
    is: (...roles: string[]) => auth.hasRole(...roles),
  };
};
