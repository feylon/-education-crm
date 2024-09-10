import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type Locale = 'uz' | 'en' | 'ru';

const LOCALE_KEY = 'crm.locale';
const SIDEBAR_KEY = 'crm.sidebarCollapsed';

export const SUPPORTED_LOCALES: Locale[] = ['uz', 'en', 'ru'];

export const readStoredLocale = (): Locale => {
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  return stored && SUPPORTED_LOCALES.includes(stored) ? stored : 'uz';
};

export const useUiStore = defineStore('ui', () => {
  const locale = ref<Locale>(readStoredLocale());
  const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_KEY) === 'true');
  const mobileSidebarOpen = ref(false);

  watch(locale, (value) => localStorage.setItem(LOCALE_KEY, value));
  watch(sidebarCollapsed, (value) => localStorage.setItem(SIDEBAR_KEY, String(value)));

  const setLocale = (value: Locale): void => {
    locale.value = value;
  };

  const toggleSidebar = (): void => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };

  const toggleMobileSidebar = (force?: boolean): void => {
    mobileSidebarOpen.value = force ?? !mobileSidebarOpen.value;
  };

  return { locale, sidebarCollapsed, mobileSidebarOpen, setLocale, toggleSidebar, toggleMobileSidebar };
});
