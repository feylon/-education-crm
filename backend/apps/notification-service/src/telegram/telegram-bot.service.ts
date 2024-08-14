import { computeBalance, roundMoney } from '@app/common/domain';
import { InvoiceStatus } from '@app/common/enums';
import { Invoice, Parent, Student, User } from '@app/database';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TelegramApiService, TelegramMessage } from './telegram-api.service';

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 9 ? `998${digits}` : digits;
};

const formatMoney = (value: number): string => `${Math.round(value).toLocaleString('ru-RU')} so'm`;

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private offset = 0;
  private running = false;

  constructor(
    private readonly api: TelegramApiService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
  ) {}

  onModuleInit(): void {
    if (!this.api.enabled) {
      this.logger.log('Telegram bot disabled (set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_ENABLED=true)');
      return;
    }
    this.running = true;
    void this.poll();
    this.logger.log('Telegram bot polling started');
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async poll(): Promise<void> {
    while (this.running) {
      const updates = await this.api.getUpdates(this.offset, 25);
      for (const update of updates) {
        this.offset = update.update_id + 1;
        if (update.message) {
          await this.handle(update.message).catch((error: unknown) =>
            this.logger.error(`Failed to handle Telegram message: ${error instanceof Error ? error.message : String(error)}`),
          );
        }
      }
      if (updates.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async handle(message: TelegramMessage): Promise<void> {
    const chatId = String(message.chat.id);
    if (message.contact) {
      await this.link(chatId, message.contact.phone_number);
      return;
    }
    const text = (message.text ?? '').trim();
    const command = text.split(/[\s@]/)[0].toLowerCase();
    switch (command) {
      case '/start':
        await this.api.sendMessage(
          chatId,
          "👋 <b>Education CRM</b> botiga xush kelibsiz!\n\nHisobingizni bog'lash uchun telefon raqamingizni yuboring.",
          { keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
        );
        return;
      case '/status':
      case '/balance':
        await this.status(chatId);
        return;
      case '/unlink':
        await this.unlink(chatId);
        return;
      case '/help':
      default:
        await this.api.sendMessage(
          chatId,
          "Buyruqlar:\n/start — hisobni bog'lash\n/status — to'lov va qarzdorlik holati\n/unlink — bog'lanishni bekor qilish\n/help — yordam",
        );
    }
  }

  private async link(chatId: string, rawPhone: string): Promise<void> {
    const phone = normalizePhone(rawPhone);
    const candidates = [`+${phone}`, phone];
    const [user, student, parent] = await Promise.all([
      this.users.findOne({ where: { phone: In(candidates), isActive: true } }),
      this.students.findOne({ where: { phone: In(candidates) } }),
      this.parents.findOne({ where: { phone: In(candidates) }, relations: { student: true } }),
    ]);
    if (!user && !student && !parent) {
      await this.api.sendMessage(chatId, "❌ Bu raqam tizimda topilmadi. Iltimos, o'quv markazi administratoriga murojaat qiling.", {
        remove_keyboard: true,
      });
      return;
    }
    const names: string[] = [];
    if (user) {
      await this.users.update(user.id, { telegramChatId: chatId });
      names.push(`${user.firstName} ${user.lastName} (xodim)`);
    }
    if (student) {
      await this.students.update(student.id, { telegramChatId: chatId });
      names.push(`${student.lastName} ${student.firstName} (o'quvchi)`);
    }
    if (parent) {
      await this.parents.update(parent.id, { telegramChatId: chatId });
      names.push(`${parent.fullName} (${parent.student.lastName} ${parent.student.firstName} ota-onasi)`);
    }
    await this.api.sendMessage(
      chatId,
      `✅ Hisob bog'landi: <b>${names.join(', ')}</b>\n\nEndi to'lovlar, qarzdorlik va darslar haqida xabarlar shu yerga keladi. Holatni ko'rish: /status`,
      { remove_keyboard: true },
    );
  }

  private async unlink(chatId: string): Promise<void> {
    await Promise.all([
      this.users.update({ telegramChatId: chatId }, { telegramChatId: null }),
      this.students.update({ telegramChatId: chatId }, { telegramChatId: null }),
      this.parents.update({ telegramChatId: chatId }, { telegramChatId: null }),
    ]);
    await this.api.sendMessage(chatId, "🔕 Bog'lanish bekor qilindi. Qayta bog'lash uchun /start yuboring.");
  }

  private async status(chatId: string): Promise<void> {
    const students = await this.resolveStudents(chatId);
    if (students.length === 0) {
      await this.api.sendMessage(chatId, "Hisobingiz hech qanday o'quvchiga bog'lanmagan. /start orqali telefon raqamingizni yuboring.");
      return;
    }
    const lines: string[] = [];
    for (const student of students) {
      const rows = await this.invoices.find({ where: { studentId: student.id }, order: { periodMonth: 'DESC' } });
      const active = rows.filter((invoice) => invoice.status !== InvoiceStatus.CANCELLED);
      const invoiced = roundMoney(active.reduce((sum, invoice) => sum + invoice.amount, 0));
      const paid = roundMoney(active.reduce((sum, invoice) => sum + invoice.paidAmount, 0));
      const { debt } = computeBalance(paid, invoiced);
      const open = active.filter((invoice) => invoice.amount > invoice.paidAmount);
      lines.push(`👤 <b>${student.lastName} ${student.firstName}</b>`);
      lines.push(`Jami hisoblangan: ${formatMoney(invoiced)}`);
      lines.push(`To'langan: ${formatMoney(paid)}`);
      lines.push(debt > 0 ? `⚠️ Qarzdorlik: <b>${formatMoney(debt)}</b> (${open.length} ta invoys)` : '✅ Qarzdorlik yo\'q');
      lines.push('');
    }
    await this.api.sendMessage(chatId, lines.join('\n').trim());
  }

  private async resolveStudents(chatId: string): Promise<Student[]> {
    const [own, parents] = await Promise.all([
      this.students.find({ where: { telegramChatId: chatId } }),
      this.parents.find({ where: { telegramChatId: chatId }, relations: { student: true } }),
    ]);
    const map = new Map<string, Student>();
    for (const student of [...own, ...parents.map((parent) => parent.student).filter(Boolean)]) {
      map.set(student.id, student);
    }
    return [...map.values()];
  }
}
