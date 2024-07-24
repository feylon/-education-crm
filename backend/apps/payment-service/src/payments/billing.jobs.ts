import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from './invoices.service';

@Injectable()
export class BillingJobs {
  private readonly logger = new Logger(BillingJobs.name);

  constructor(private readonly invoices: InvoicesService) {}

  @Cron('0 1 1 * *', { name: 'monthly-invoices' })
  async generateMonthlyInvoices(): Promise<void> {
    const now = new Date();
    const result = await this.invoices.generate({ periodMonth: now.toISOString().slice(0, 10), dueDay: 10 }, null);
    this.logger.log(`Monthly invoicing created ${result.created} invoice(s) for ${result.periodMonth}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'mark-overdue-invoices' })
  async markOverdue(): Promise<void> {
    const count = await this.invoices.markOverdue();
    if (count > 0) {
      this.logger.log(`Marked ${count} invoice(s) as overdue`);
    }
  }
}
