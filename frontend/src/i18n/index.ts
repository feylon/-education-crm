import { readStoredLocale } from '@/stores/ui.store';
import { createI18n } from 'vue-i18n';
import en from './locales/en';
import ru from './locales/ru';
import uz from './locales/uz';

export type MessageSchema = typeof en;

export const i18n = createI18n<[MessageSchema], 'uz' | 'en' | 'ru'>({
  legacy: false,
  locale: readStoredLocale(),
  fallbackLocale: 'en',
  messages: { uz, en, ru },
  missingWarn: false,
  fallbackWarn: false,
});
