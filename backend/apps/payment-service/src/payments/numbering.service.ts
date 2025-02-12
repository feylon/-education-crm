import { monthKey } from '@app/common/utils';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class NumberingService {
  async lock(manager: EntityManager, key: string): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  }

  async next(manager: EntityManager, table: 'invoices' | 'payments', prefix: 'INV' | 'PAY', date: Date): Promise<string> {
    const period = monthKey(date).replace('-', '');
    await this.lock(manager, `${table}:${period}`);
    const pattern = `${prefix}-${period}-%`;
    const row = await manager.query(
      `SELECT MAX(CAST(SPLIT_PART(number, '-', 3) AS INTEGER)) AS last FROM ${table} WHERE number LIKE $1`,
      [pattern],
    );
    const last = Number(row?.[0]?.last ?? 0);
    return `${prefix}-${period}-${String(last + 1).padStart(5, '0')}`;
  }
}
