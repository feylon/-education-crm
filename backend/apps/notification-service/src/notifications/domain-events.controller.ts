import { EVENTS } from '@app/common/constants';
import { AttendanceStatus, NotificationType } from '@app/common/enums';
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AudienceService } from './audience.service';
import { NotificationsService } from './notifications.service';

interface StudentCreatedEvent {
  studentId: string;
  fullName: string;
  createdBy: string;
}

interface PaymentCreatedEvent {
  paymentId: string;
  number: string;
  studentId: string;
  studentUserId: string | null;
  studentName: string;
  amount: number;
  method: string;
  receivedBy: string;
}

interface PaymentRefundedEvent {
  paymentId: string;
  studentId: string;
  studentUserId: string | null;
  amount: number;
  reason: string;
  actorId: string;
}

interface GroupEvent {
  groupId: string;
  name: string;
  teacherId: string | null;
  previousTeacherId?: string | null;
  changes?: string[];
}

interface EnrollmentEvent {
  groupId: string;
  groupName: string;
  teacherId: string | null;
  studentId: string;
  studentName?: string;
  actorId: string;
}

interface AttendanceMarkedEvent {
  lessonId: string;
  groupId: string;
  groupName: string;
  date: string;
  records: Array<{ studentId: string; status: AttendanceStatus }>;
}

interface InvoiceEvent {
  invoiceId: string;
  number: string;
  studentId: string;
  studentUserId: string | null;
  amount: number;
  outstanding?: number;
  dueDate: string;
  periodMonth?: string;
}

const money = (value: number): string => `${Math.round(value).toLocaleString('ru-RU')} UZS`;

@Controller()
export class DomainEventsController {
  private readonly logger = new Logger(DomainEventsController.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly audience: AudienceService,
  ) {}

  @EventPattern(EVENTS.STUDENT_CREATED)
  async onStudentCreated(@Payload() event: StudentCreatedEvent): Promise<void> {
    const staff = (await this.audience.staff()).filter((id) => id !== event.createdBy);
    await this.notifications.notify({
      userIds: staff,
      type: NotificationType.STUDENT_CREATED,
      title: 'New student registered',
      body: `${event.fullName} has been added to the CRM.`,
      data: { studentId: event.studentId, fullName: event.fullName },
    });
  }

  @EventPattern(EVENTS.PAYMENT_CREATED)
  async onPaymentCreated(@Payload() event: PaymentCreatedEvent): Promise<void> {
    const contacts = await this.audience.studentContacts(event.studentId);
    const finance = (await this.audience.finance()).filter((id) => id !== event.receivedBy);
    await Promise.all([
      this.notifications.notify({
        userIds: finance,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment received',
        body: `${event.studentName} paid ${money(event.amount)} (${event.method}).`,
        data: { paymentId: event.paymentId, studentId: event.studentId, amount: event.amount, method: event.method, number: event.number },
      }),
      this.notifications.notify({
        userIds: contacts?.userId ? [contacts.userId] : [],
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment accepted',
        body: `Your payment of ${money(event.amount)} (${event.number}) has been recorded. Thank you!`,
        data: { paymentId: event.paymentId, amount: event.amount, number: event.number },
        telegramChatIds: contacts?.chatIds,
        telegramText: `✅ <b>To'lov qabul qilindi</b>\n${contacts?.fullName ?? ''}: ${money(event.amount)} (${event.number}). Rahmat!`,
      }),
    ]);
  }

  @EventPattern(EVENTS.PAYMENT_REFUNDED)
  async onPaymentRefunded(@Payload() event: PaymentRefundedEvent): Promise<void> {
    const contacts = await this.audience.studentContacts(event.studentId);
    const finance = (await this.audience.finance()).filter((id) => id !== event.actorId);
    await Promise.all([
      this.notifications.notify({
        userIds: finance,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment refunded',
        body: `A payment of ${money(event.amount)} was refunded: ${event.reason}`,
        data: { paymentId: event.paymentId, studentId: event.studentId, amount: event.amount },
      }),
      this.notifications.notify({
        userIds: contacts?.userId ? [contacts.userId] : [],
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment refunded',
        body: `Your payment of ${money(event.amount)} was refunded: ${event.reason}`,
        data: { paymentId: event.paymentId, amount: event.amount },
        telegramChatIds: contacts?.chatIds,
        telegramText: `↩️ <b>To'lov qaytarildi</b>: ${money(event.amount)}. Sabab: ${event.reason}`,
      }),
    ]);
  }

  @EventPattern(EVENTS.GROUP_CREATED)
  async onGroupCreated(@Payload() event: GroupEvent): Promise<void> {
    const teacherUser = await this.audience.teacherUser(event.teacherId);
    await this.notifications.notify({
      userIds: teacherUser ? [teacherUser] : [],
      type: NotificationType.GROUP_CHANGED,
      title: 'New group assigned',
      body: `You have been assigned as the teacher of group ${event.name}.`,
      data: { groupId: event.groupId, name: event.name },
    });
  }

  @EventPattern(EVENTS.GROUP_UPDATED)
  async onGroupUpdated(@Payload() event: GroupEvent): Promise<void> {
    const [current, previous] = await Promise.all([
      this.audience.teacherUser(event.teacherId),
      this.audience.teacherUser(event.previousTeacherId),
    ]);
    const changes = (event.changes ?? []).join(', ');
    const tasks: Promise<unknown>[] = [];
    if (current) {
      tasks.push(
        this.notifications.notify({
          userIds: [current],
          type: NotificationType.GROUP_CHANGED,
          title: previous && previous !== current ? 'New group assigned' : 'Group updated',
          body: previous && previous !== current ? `You are now the teacher of group ${event.name}.` : `Group ${event.name} was updated (${changes}).`,
          data: { groupId: event.groupId, name: event.name, changes: event.changes },
        }),
      );
    }
    if (previous && previous !== current) {
      tasks.push(
        this.notifications.notify({
          userIds: [previous],
          type: NotificationType.GROUP_CHANGED,
          title: 'Group reassigned',
          body: `Group ${event.name} has been reassigned to another teacher.`,
          data: { groupId: event.groupId, name: event.name },
        }),
      );
    }
    await Promise.all(tasks);
  }

  @EventPattern(EVENTS.GROUP_STUDENT_ENROLLED)
  async onEnrolled(@Payload() event: EnrollmentEvent): Promise<void> {
    const [teacherUser, contacts] = await Promise.all([this.audience.teacherUser(event.teacherId), this.audience.studentContacts(event.studentId)]);
    await Promise.all([
      this.notifications.notify({
        userIds: teacherUser ? [teacherUser] : [],
        type: NotificationType.GROUP_ENROLLMENT,
        title: 'New student in your group',
        body: `${event.studentName ?? contacts?.fullName ?? 'A student'} joined group ${event.groupName}.`,
        data: { groupId: event.groupId, studentId: event.studentId },
      }),
      this.notifications.notify({
        userIds: contacts?.userId ? [contacts.userId] : [],
        type: NotificationType.GROUP_ENROLLMENT,
        title: 'Enrolled in a group',
        body: `You have been enrolled in group ${event.groupName}.`,
        data: { groupId: event.groupId },
        telegramChatIds: contacts?.chatIds,
        telegramText: `🎓 <b>${contacts?.fullName ?? ''}</b> ${event.groupName} guruhiga qo'shildi.`,
      }),
    ]);
  }

  @EventPattern(EVENTS.GROUP_STUDENT_LEFT)
  async onLeft(@Payload() event: EnrollmentEvent): Promise<void> {
    const [teacherUser, contacts] = await Promise.all([this.audience.teacherUser(event.teacherId), this.audience.studentContacts(event.studentId)]);
    await this.notifications.notify({
      userIds: teacherUser ? [teacherUser] : [],
      type: NotificationType.GROUP_ENROLLMENT,
      title: 'Student left your group',
      body: `${contacts?.fullName ?? 'A student'} left group ${event.groupName ?? ''}.`,
      data: { groupId: event.groupId, studentId: event.studentId },
    });
  }

  @EventPattern(EVENTS.ATTENDANCE_MARKED)
  async onAttendanceMarked(@Payload() event: AttendanceMarkedEvent): Promise<void> {
    const absent = event.records.filter((record) => record.status === AttendanceStatus.ABSENT);
    for (const record of absent) {
      const contacts = await this.audience.studentContacts(record.studentId);
      if (!contacts) {
        continue;
      }
      await this.notifications.notify({
        userIds: contacts.userId ? [contacts.userId] : [],
        type: NotificationType.ATTENDANCE_MARKED,
        title: 'Absence recorded',
        body: `${contacts.fullName} was marked absent in ${event.groupName} on ${event.date}.`,
        data: { lessonId: event.lessonId, groupId: event.groupId, date: event.date, status: record.status },
        telegramChatIds: contacts.chatIds,
        telegramText: `❗️ <b>${contacts.fullName}</b> ${event.date} kuni ${event.groupName} darsida qatnashmadi.`,
      });
    }
    this.logger.debug(`Attendance marked for lesson ${event.lessonId}: ${event.records.length} record(s), ${absent.length} absent`);
  }

  @EventPattern(EVENTS.INVOICE_CREATED)
  async onInvoiceCreated(@Payload() event: InvoiceEvent): Promise<void> {
    const contacts = await this.audience.studentContacts(event.studentId);
    await this.notifications.notify({
      userIds: contacts?.userId ? [contacts.userId] : [],
      type: NotificationType.INVOICE_CREATED,
      title: 'New invoice',
      body: `Invoice ${event.number} for ${money(event.amount)} is due on ${event.dueDate}.`,
      data: { invoiceId: event.invoiceId, number: event.number, amount: event.amount, dueDate: event.dueDate },
      telegramChatIds: contacts?.chatIds,
      telegramText: `🧾 <b>Yangi invoys</b> ${event.number}: ${money(event.amount)}. To'lov muddati: ${event.dueDate}`,
    });
  }

  @EventPattern(EVENTS.INVOICE_OVERDUE)
  async onInvoiceOverdue(@Payload() event: InvoiceEvent): Promise<void> {
    const contacts = await this.audience.studentContacts(event.studentId);
    await this.notifications.notify({
      userIds: contacts?.userId ? [contacts.userId] : [],
      type: NotificationType.PAYMENT_REMINDER,
      title: 'Invoice overdue',
      body: `Invoice ${event.number} (${money(event.outstanding ?? event.amount)} outstanding) was due on ${event.dueDate}.`,
      data: { invoiceId: event.invoiceId, number: event.number, outstanding: event.outstanding, dueDate: event.dueDate },
      telegramChatIds: contacts?.chatIds,
      telegramText: `⏰ <b>Muddati o'tgan invoys</b> ${event.number}: ${money(event.outstanding ?? event.amount)} (muddat ${event.dueDate}).`,
    });
  }
}
