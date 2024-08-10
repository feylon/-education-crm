import { InvoiceStatus, NotificationType } from '@app/common/enums';
import { addDays, toDateOnly } from '@app/common/utils';
import { Invoice } from '@app/database';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AudienceService } from './audience.service';
import { NotificationsService } from './notifications.service';

const money = (value: number): string => `${Math.round(value).toLocaleString('ru-RU')} UZS`;

@Injectable()
export class ReminderJobs {
  private readonly logger = new Logger(ReminderJobs.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    private readonly notifications: NotificationsService,
    private readonly audience: AudienceService,
  ) {}

  @Cron('0 9 * * *', { name: 'debt-reminders' })
  async debtReminders(): Promise<void> {
    const open = await this.invoices.find({
      where: { status: In([InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE, InvoiceStatus.PENDING]) },
    });
    const today = toDateOnly(new Date());
    const perStudent = new Map<string, { debt: number; overdue: number }>();
    for (const invoice of open) {
      const outstanding = invoice.amount - invoice.paidAmount;
      if (outstanding <= 0 || invoice.dueDate >= today) {
        continue;
      }
      const entry = perStudent.get(invoice.studentId) ?? { debt: 0, overdue: 0 };
      entry.debt += outstanding;
      entry.overdue += 1;
      perStudent.set(invoice.studentId, entry);
    }
    let sent = 0;
    for (const [studentId, entry] of perStudent) {
      const contacts = await this.audience.studentContacts(studentId);
      if (!contacts) {
        continue;
      }
      await this.notifications.notify({
        userIds: contacts.userId ? [contacts.userId] : [],
        type: NotificationType.DEBT_REMINDER,
        title: 'Outstanding debt reminder',
        body: `${contacts.fullName} has ${money(entry.debt)} outstanding across ${entry.overdue} overdue invoice(s). Please settle the balance.`,
        data: { studentId, debt: entry.debt, overdueInvoices: entry.overdue },
        telegramChatIds: contacts.chatIds,
        telegramText: `💳 <b>Qarzdorlik eslatmasi</b>\n${contacts.fullName}: ${money(entry.debt)} (${entry.overdue} ta muddati o'tgan invoys). Iltimos, to'lovni amalga oshiring.`,
      });
      sent += 1;
    }
    if (perStudent.size > 0) {
      const totalDebt = [...perStudent.values()].reduce((sum, entry) => sum + entry.debt, 0);
      await this.notifications.notify({
        userIds: await this.audience.finance(),
        type: NotificationType.DEBT_REMINDER,
        title: 'Daily debtors summary',
        body: `${perStudent.size} student(s) have overdue debt totalling ${money(totalDebt)}.`,
        data: { debtors: perStudent.size, totalDebt },
      });
    }
    this.logger.log(`Debt reminders sent to ${sent} student(s)`);
  }

  @Cron('0 10 * * *', { name: 'upcoming-payment-reminders' })
  async upcomingPaymentReminders(): Promise<void> {
    const target = toDateOnly(addDays(new Date(), 3));
    const due = await this.invoices.find({ where: { status: In([InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID]), dueDate: target } });
    for (const invoice of due) {
      const contacts = await this.audience.studentContacts(invoice.studentId);
      if (!contacts) {
        continue;
      }
      const outstanding = invoice.amount - invoice.paidAmount;
      await this.notifications.notify({
        userIds: contacts.userId ? [contacts.userId] : [],
        type: NotificationType.PAYMENT_REMINDER,
        title: 'Payment due soon',
        body: `Invoice ${invoice.number} (${money(outstanding)}) is due on ${invoice.dueDate}.`,
        data: { invoiceId: invoice.id, number: invoice.number, outstanding, dueDate: invoice.dueDate },
        telegramChatIds: contacts.chatIds,
        telegramText: `🔔 <b>To'lov eslatmasi</b>\n${contacts.fullName}: ${invoice.number} invoysi (${money(outstanding)}) ${invoice.dueDate} gacha to'lanishi kerak.`,
      });
    }
    this.logger.log(`Upcoming payment reminders processed: ${due.length}`);
  }
}
