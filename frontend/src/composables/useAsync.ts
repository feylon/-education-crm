import { HttpError } from '@/api/http';
import { ref, shallowRef } from 'vue';

export const errorMessage = (error: unknown, fallback = 'Unexpected error'): string => {
  if (error instanceof HttpError) {
    return error.errors.length ? `${error.message}: ${error.errors.join(', ')}` : error.message;
  }
  return error instanceof Error ? error.message : fallback;
};

export const useAsync = <T>(task: () => Promise<T>, immediate = true) => {
  const data = shallowRef<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const run = async (): Promise<T | null> => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await task();
      return data.value;
    } catch (caught) {
      error.value = errorMessage(caught);
      return null;
    } finally {
      loading.value = false;
    }
  };

  if (immediate) {
    void run();
  }

  return { data, loading, error, run };
};
