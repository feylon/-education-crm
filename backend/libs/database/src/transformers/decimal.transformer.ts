import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(value?: number | null): string | number | null | undefined {
    return value;
  }

  from(value?: string | null): number | null {
    return value === null || value === undefined ? null : Number(value);
  }
}

export const decimalTransformer = new DecimalTransformer();
