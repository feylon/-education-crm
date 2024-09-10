import type { ListQuery, Paginated } from '@/api/types';
import { errorMessage } from '@/composables/useAsync';
import { reactive, ref, shallowRef, watch } from 'vue';

export interface PaginationOptions<F extends Record<string, string | number | boolean | null | undefined>> {
  limit?: number;
  filters?: F;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  immediate?: boolean;
}

let debounceTimer: number | undefined;

export const usePagination = <T, F extends Record<string, string | number | boolean | null | undefined> = Record<string, string | number | boolean | null | undefined>>(
  fetcher: (query: ListQuery) => Promise<Paginated<T>>,
  options: PaginationOptions<F> = {},
) => {
  const items = shallowRef<T[]>([]);
  const total = ref(0);
  const totalPages = ref(1);
  const page = ref(1);
  const limit = ref(options.limit ?? 20);
  const search = ref('');
  const sortBy = ref<string | undefined>(options.sortBy);
  const sortOrder = ref<'ASC' | 'DESC'>(options.sortOrder ?? 'DESC');
  const filters = reactive({ ...(options.filters ?? {}) }) as F;
  const loading = ref(false);
  const error = ref<string | null>(null);

  const load = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const result = await fetcher({
        page: page.value,
        limit: limit.value,
        search: search.value || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        ...Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value ?? undefined])),
      });
      items.value = result.items;
      total.value = result.meta.total;
      totalPages.value = result.meta.totalPages;
      if (page.value > result.meta.totalPages && result.meta.totalPages > 0) {
        page.value = result.meta.totalPages;
      }
    } catch (caught) {
      error.value = errorMessage(caught);
    } finally {
      loading.value = false;
    }
  };

  const reload = (): Promise<void> => load();

  const setPage = (value: number): void => {
    page.value = value;
  };

  const toggleSort = (field: string): void => {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC';
    } else {
      sortBy.value = field;
      sortOrder.value = 'ASC';
    }
  };

  const resetFilters = (): void => {
    for (const key of Object.keys(filters) as Array<keyof F>) {
      filters[key] = (options.filters?.[key] ?? undefined) as F[keyof F];
    }
    search.value = '';
    page.value = 1;
  };

  watch([page, limit, sortBy, sortOrder], () => void load());
  watch(
    () => ({ ...filters }),
    () => {
      page.value = 1;
      void load();
    },
    { deep: true },
  );
  watch(search, () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      page.value = 1;
      void load();
    }, 350);
  });

  if (options.immediate !== false) {
    void load();
  }

  return { items, total, totalPages, page, limit, search, sortBy, sortOrder, filters, loading, error, load, reload, setPage, toggleSort, resetFilters };
};
