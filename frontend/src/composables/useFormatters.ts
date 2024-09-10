import { useUiStore } from '@/stores/ui.store';

const LOCALE_TAGS: Record<string, string> = { uz: 'ru-RU', en: 'en-GB', ru: 'ru-RU' };
const UZ_MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export const useFormatters = () => {
  const ui = useUiStore();
  const tag = () => LOCALE_TAGS[ui.locale] ?? 'en-GB';

  const money = (value: number | string | null | undefined): string => {
    const amount = Number(value ?? 0);
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} UZS`;
  };

  const number = (value: number | string | null | undefined): string => new Intl.NumberFormat(tag()).format(Number(value ?? 0));

  const percent = (value: number | null | undefined): string => `${Number(value ?? 0).toFixed(value && value % 1 ? 1 : 0)}%`;

  const date = (value: string | Date | null | undefined): string => {
    if (!value) return '—';
    const parsed = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return new Intl.DateTimeFormat(tag(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
  };

  const dateTime = (value: string | Date | null | undefined): string => {
    if (!value) return '—';
    return new Intl.DateTimeFormat(tag(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
      new Date(value),
    );
  };

  const time = (value: string | null | undefined): string => (value ? value.slice(0, 5) : '—');

  const monthLabel = (period: string): string => {
    const [year, month] = period.split('-').map(Number);
    if (ui.locale === 'uz') {
      return `${UZ_MONTHS[(month ?? 1) - 1]} ${year}`;
    }
    return new Intl.DateTimeFormat(tag(), { month: 'short', year: 'numeric' }).format(new Date(year, (month ?? 1) - 1, 1));
  };

  const initials = (first?: string | null, last?: string | null): string => `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase();

  const fullName = (person?: { firstName?: string; lastName?: string } | null): string =>
    person ? `${person.lastName ?? ''} ${person.firstName ?? ''}`.trim() : '—';

  return { money, number, percent, date, dateTime, time, monthLabel, initials, fullName };
};

export const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const addDaysIso = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const startOfWeekIso = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return addDaysIso(iso, 1 - day);
};

export const firstOfMonthIso = (offsetMonths = 0): string => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};
