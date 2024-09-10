import { computed, reactive, ref } from 'vue';

export type Rule<T> = (value: T, form: Record<string, unknown>) => string | true;

export const rules = {
  required:
    (message: string): Rule<unknown> =>
    (value) =>
      value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) ? message : true,
  email:
    (message: string): Rule<unknown> =>
    (value) =>
      !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) ? true : message,
  minLength:
    (length: number, message: string): Rule<unknown> =>
    (value) =>
      !value || String(value).length >= length ? true : message,
  min:
    (minimum: number, message: string): Rule<unknown> =>
    (value) =>
      value === undefined || value === null || value === '' || Number(value) >= minimum ? true : message,
  max:
    (maximum: number, message: string): Rule<unknown> =>
    (value) =>
      value === undefined || value === null || value === '' || Number(value) <= maximum ? true : message,
  phone:
    (message: string): Rule<unknown> =>
    (value) =>
      !value || /^\+?[0-9\s-]{9,20}$/.test(String(value)) ? true : message,
  time:
    (message: string): Rule<unknown> =>
    (value) =>
      !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) ? true : message,
};

export const useForm = <T extends Record<string, unknown>>(initial: T, schema: Partial<Record<keyof T, Rule<unknown>[]>> = {}) => {
  const values = reactive({ ...initial }) as T;
  const errors = reactive<Record<string, string>>({});
  const submitting = ref(false);
  const serverError = ref<string | null>(null);

  const validateField = (field: keyof T): boolean => {
    const fieldRules = schema[field] ?? [];
    for (const rule of fieldRules) {
      const result = rule(values[field], values);
      if (result !== true) {
        errors[field as string] = result;
        return false;
      }
    }
    delete errors[field as string];
    return true;
  };

  const validate = (): boolean => {
    let valid = true;
    for (const field of Object.keys(schema) as Array<keyof T>) {
      if (!validateField(field)) {
        valid = false;
      }
    }
    return valid;
  };

  const reset = (next?: Partial<T>): void => {
    Object.assign(values, { ...initial, ...(next ?? {}) });
    for (const key of Object.keys(errors)) {
      delete errors[key];
    }
    serverError.value = null;
  };

  const isValid = computed(() => Object.keys(errors).length === 0);

  const submit = async (handler: (values: T) => Promise<void>): Promise<boolean> => {
    serverError.value = null;
    if (!validate()) {
      return false;
    }
    submitting.value = true;
    try {
      await handler(values);
      return true;
    } catch (error) {
      serverError.value = error instanceof Error ? error.message : String(error);
      return false;
    } finally {
      submitting.value = false;
    }
  };

  return { values, errors, submitting, serverError, isValid, validate, validateField, reset, submit };
};
