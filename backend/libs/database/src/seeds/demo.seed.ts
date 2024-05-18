import {
  AttendanceStatus,
  EnrollmentStatus,
  Gender,
  GroupStatus,
  InvoiceStatus,
  LessonStatus,
  PaymentMethod,
  PaymentStatus,
  RoleName,
  SalaryType,
} from '@app/common/enums';
import { addDays, isoWeekday, monthKey, toDateOnly } from '@app/common/utils/date.util';
import { computeInvoiceAmount, resolveInvoiceStatus, roundMoney } from '@app/common/domain/billing.util';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import {
  AttendanceRecord,
  Branch,
  Course,
  CourseCategory,
  Group,
  GroupStudent,
  Invoice,
  Lesson,
  Parent,
  Payment,
  PaymentAllocation,
  Role,
  Room,
  Schedule,
  Student,
  Teacher,
  User,
} from '../entities';
import { Seeder } from './seed.types';

export const DEMO_PASSWORD = 'Password123!';

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: RoleName;
}

const DEMO_USERS: DemoUser[] = [
  { email: 'superadmin@crm.local', firstName: 'Sardor', lastName: 'Karimov', phone: '+998901000001', role: RoleName.SUPER_ADMIN },
  { email: 'admin@crm.local', firstName: 'Dilnoza', lastName: 'Rahimova', phone: '+998901000002', role: RoleName.ADMIN },
  { email: 'manager@crm.local', firstName: 'Bekzod', lastName: 'Tursunov', phone: '+998901000003', role: RoleName.MANAGER },
  { email: 'cashier@crm.local', firstName: 'Malika', lastName: 'Yusupova', phone: '+998901000004', role: RoleName.CASHIER },
];

const DEMO_TEACHERS = [
  { email: 'teacher@crm.local', firstName: 'Aziz', lastName: 'Nazarov', phone: '+998902000001', specialization: 'English' },
  { email: 'teacher2@crm.local', firstName: 'Nilufar', lastName: 'Sobirova', phone: '+998902000002', specialization: 'Mathematics' },
  { email: 'teacher3@crm.local', firstName: 'Jasur', lastName: 'Ergashev', phone: '+998902000003', specialization: 'Programming' },
];

const STUDENT_NAMES: [string, string, Gender][] = [
  ['Ali', 'Valiyev', Gender.MALE],
  ['Laylo', 'Qodirova', Gender.FEMALE],
  ['Sherzod', 'Mirzayev', Gender.MALE],
  ['Madina', 'Abdullayeva', Gender.FEMALE],
  ['Javohir', 'Toshpulatov', Gender.MALE],
  ['Zilola', 'Hamidova', Gender.FEMALE],
  ['Otabek', 'Saidov', Gender.MALE],
  ['Gulnora', 'Ismoilova', Gender.FEMALE],
  ['Doston', 'Rustamov', Gender.MALE],
  ['Sevara', 'Alimova', Gender.FEMALE],
  ['Umid', 'Xolmatov', Gender.MALE],
  ['Kamola', 'Nurmatova', Gender.FEMALE],
  ['Bobur', 'Yoqubov', Gender.MALE],
  ['Nodira', 'Shukurova', Gender.FEMALE],
  ['Farrux', 'Boboyev', Gender.MALE],
  ['Mohira', 'Qosimova', Gender.FEMALE],
  ['Sanjar', 'Olimov', Gender.MALE],
  ['Dildora', 'Rahmatova', Gender.FEMALE],
];

const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const firstDayOfMonthsAgo = (months: number): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, 1);
};

export const demoSeed: Seeder = {
  name: 'demo-data',
  async run(dataSource: DataSource): Promise<void> {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const roles = new Map((await dataSource.getRepository(Role).find()).map((role) => [role.name, role]));
    const roleOf = (name: RoleName): Role => {
      const role = roles.get(name);
      if (!role) {
        throw new Error(`Role ${name} is missing, run the roles seed first`);
      }
      return role;
    };

    const userRepo = dataSource.getRepository(User);
    const ensureUser = async (data: Omit<DemoUser, 'role'> & { role: RoleName }): Promise<User> => {
      const existing = await userRepo.findOne({ where: { email: data.email } });
      if (existing) {
        return existing;
      }
      return userRepo.save(
        userRepo.create({
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          isActive: true,
          roles: [roleOf(data.role)],
        }),
      );
    };

    for (const demo of DEMO_USERS) {
      await ensureUser(demo);
    }

    const branchRepo = dataSource.getRepository(Branch);
    let branch = await branchRepo.findOne({ where: { name: 'Main Branch' } });
    if (!branch) {
      branch = await branchRepo.save(
        branchRepo.create({ name: 'Main Branch', address: 'Tashkent, Amir Temur 15', phone: '+998712000000' }),
      );
    }

    const roomRepo = dataSource.getRepository(Room);
    const rooms: Room[] = [];
    for (const [index, name] of ['Room 101', 'Room 102', 'Room 201', 'Room 202'].entries()) {
      let room = await roomRepo.findOne({ where: { branchId: branch.id, name } });
      if (!room) {
        room = await roomRepo.save(roomRepo.create({ branchId: branch.id, name, capacity: 10 + index * 2 }));
      }
      rooms.push(room);
    }

    const categoryRepo = dataSource.getRepository(CourseCategory);
    const categories = new Map<string, CourseCategory>();
    for (const name of ['Languages', 'Exact Sciences', 'IT']) {
      let category = await categoryRepo.findOne({ where: { name } });
      if (!category) {
        category = await categoryRepo.save(categoryRepo.create({ name, description: `${name} courses` }));
      }
      categories.set(name, category);
    }

    const courseRepo = dataSource.getRepository(Course);
    const courseDefs = [
      { name: 'General English', category: 'Languages', price: 450000, durationMonths: 6, color: '#2563eb' },
      { name: 'IELTS Preparation', category: 'Languages', price: 650000, durationMonths: 4, color: '#7c3aed' },
      { name: 'Mathematics', category: 'Exact Sciences', price: 400000, durationMonths: 9, color: '#059669' },
      { name: 'Frontend Development', category: 'IT', price: 900000, durationMonths: 6, color: '#ea580c' },
    ];
    const courses: Course[] = [];
    for (const def of courseDefs) {
      let course = await courseRepo.findOne({ where: { name: def.name } });
      if (!course) {
        course = await courseRepo.save(
          courseRepo.create({
            name: def.name,
            description: `${def.name} course`,
            categoryId: categories.get(def.category)?.id ?? null,
            price: def.price,
            durationMonths: def.durationMonths,
            color: def.color,
          }),
        );
      }
      courses.push(course);
    }

    const teacherRepo = dataSource.getRepository(Teacher);
    const teachers: Teacher[] = [];
    for (const def of DEMO_TEACHERS) {
      const user = await ensureUser({ ...def, role: RoleName.TEACHER });
      let teacher = await teacherRepo.findOne({ where: { userId: user.id } });
      if (!teacher) {
        teacher = await teacherRepo.save(
          teacherRepo.create({
            userId: user.id,
            firstName: def.firstName,
            lastName: def.lastName,
            phone: def.phone,
            specialization: def.specialization,
            hireDate: toDateOnly(firstDayOfMonthsAgo(12)),
            salaryType: SalaryType.PERCENT,
            salaryAmount: 40,
            branchId: branch.id,
          }),
        );
      }
      teachers.push(teacher);
    }

    const studentRepo = dataSource.getRepository(Student);
    const parentRepo = dataSource.getRepository(Parent);
    const students: Student[] = [];
    for (const [index, [firstName, lastName, gender]] of STUDENT_NAMES.entries()) {
      const phone = `+99890300${String(index + 1).padStart(4, '0')}`;
      let student = await studentRepo.findOne({ where: { phone } });
      if (!student) {
        const user =
          index === 0
            ? await ensureUser({ email: 'student@crm.local', firstName, lastName, phone, role: RoleName.STUDENT })
            : null;
        student = await studentRepo.save(
          studentRepo.create({
            userId: user?.id ?? null,
            firstName,
            lastName,
            gender,
            phone,
            email: index === 0 ? 'student@crm.local' : null,
            birthDate: toDateOnly(new Date(2000 + (index % 8), index % 12, 1 + (index % 27))),
            address: `Tashkent, Street ${index + 1}`,
            branchId: branch.id,
            emergencyContactName: `${lastName} family`,
            emergencyContactPhone: `+99890400${String(index + 1).padStart(4, '0')}`,
          }),
        );
        await parentRepo.save(
          parentRepo.create({
            studentId: student.id,
            fullName: `${lastName} ${gender === Gender.MALE ? 'Akbar' : 'Nigora'}`,
            phone: `+99890500${String(index + 1).padStart(4, '0')}`,
            relation: gender === Gender.MALE ? 'FATHER' : 'MOTHER',
            isPrimary: true,
          }),
        );
      }
      students.push(student);
    }

    const groupRepo = dataSource.getRepository(Group);
    const scheduleRepo = dataSource.getRepository(Schedule);
    const groupDefs = [
      { name: 'ENG-A1', course: 0, teacher: 0, room: 0, weekdays: [1, 3, 5], start: '09:00', end: '10:30' },
      { name: 'IELTS-01', course: 1, teacher: 0, room: 1, weekdays: [2, 4, 6], start: '11:00', end: '13:00' },
      { name: 'MATH-7', course: 2, teacher: 1, room: 2, weekdays: [1, 3, 5], start: '14:00', end: '15:30' },
      { name: 'FE-2024', course: 3, teacher: 2, room: 3, weekdays: [2, 4, 6], start: '18:00', end: '20:00' },
    ];
    const startDate = toDateOnly(firstDayOfMonthsAgo(3));
    const groups: Group[] = [];
    for (const def of groupDefs) {
      let group = await groupRepo.findOne({ where: { name: def.name } });
      if (!group) {
        group = await groupRepo.save(
          groupRepo.create({
            name: def.name,
            courseId: courses[def.course].id,
            teacherId: teachers[def.teacher].id,
            roomId: rooms[def.room].id,
            branchId: branch.id,
            startDate,
            endDate: null,
            monthlyFee: courses[def.course].price,
            capacity: 12,
            status: GroupStatus.ACTIVE,
          }),
        );
        for (const weekday of def.weekdays) {
          await scheduleRepo.save(
            scheduleRepo.create({
              groupId: group.id,
              roomId: rooms[def.room].id,
              weekday,
              startTime: def.start,
              endTime: def.end,
              effectiveFrom: startDate,
              effectiveTo: null,
            }),
          );
        }
      }
      groups.push(group);
    }

    const enrollmentRepo = dataSource.getRepository(GroupStudent);
    const enrollments: GroupStudent[] = [];
    for (const [index, student] of students.entries()) {
      const groupIndexes = [index % groups.length, ...(index % 3 === 0 ? [(index + 1) % groups.length] : [])];
      for (const groupIndex of groupIndexes) {
        const group = groups[groupIndex];
        let enrollment = await enrollmentRepo.findOne({ where: { groupId: group.id, studentId: student.id } });
        if (!enrollment) {
          enrollment = await enrollmentRepo.save(
            enrollmentRepo.create({
              groupId: group.id,
              studentId: student.id,
              joinedAt: startDate,
              discountPercent: index % 5 === 0 ? 10 : 0,
              status: EnrollmentStatus.ACTIVE,
            }),
          );
        }
        enrollments.push(enrollment);
      }
    }

    const lessonRepo = dataSource.getRepository(Lesson);
    const attendanceRepo = dataSource.getRepository(AttendanceRecord);
    const existingLessons = await lessonRepo.count();
    if (existingLessons === 0) {
      const today = new Date();
      const schedules = await scheduleRepo.find();
      const schedulesByGroup = new Map<string, Schedule[]>();
      for (const schedule of schedules) {
        schedulesByGroup.set(schedule.groupId, [...(schedulesByGroup.get(schedule.groupId) ?? []), schedule]);
      }
      let seed = 1;
      for (const group of groups) {
        const groupEnrollments = enrollments.filter((enrollment) => enrollment.groupId === group.id);
        for (let cursor = new Date(startDate); cursor <= today; cursor = addDays(cursor, 1)) {
          const slot = (schedulesByGroup.get(group.id) ?? []).find((item) => item.weekday === isoWeekday(cursor));
          if (!slot) {
            continue;
          }
          const lesson = await lessonRepo.save(
            lessonRepo.create({
              groupId: group.id,
              scheduleId: slot.id,
              teacherId: group.teacherId,
              roomId: slot.roomId,
              date: toDateOnly(cursor),
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: LessonStatus.COMPLETED,
              topic: `Lesson on ${toDateOnly(cursor)}`,
            }),
          );
          for (const enrollment of groupEnrollments) {
            const roll = pseudoRandom(seed++);
            const status =
              roll < 0.78
                ? AttendanceStatus.PRESENT
                : roll < 0.88
                  ? AttendanceStatus.LATE
                  : roll < 0.95
                    ? AttendanceStatus.ABSENT
                    : AttendanceStatus.EXCUSED;
            await attendanceRepo.save(
              attendanceRepo.create({ lessonId: lesson.id, studentId: enrollment.studentId, status, note: null }),
            );
          }
        }
      }
    }

    const invoiceRepo = dataSource.getRepository(Invoice);
    const paymentRepo = dataSource.getRepository(Payment);
    const allocationRepo = dataSource.getRepository(PaymentAllocation);
    const existingInvoices = await invoiceRepo.count();
    if (existingInvoices === 0) {
      const today = toDateOnly(new Date());
      let invoiceCounter = 1;
      let paymentCounter = 1;
      let seed = 500;
      const cashier = await userRepo.findOne({ where: { email: 'cashier@crm.local' } });
      for (const enrollment of enrollments) {
        const group = groups.find((item) => item.id === enrollment.groupId);
        if (!group) {
          continue;
        }
        for (let monthsAgo = 3; monthsAgo >= 0; monthsAgo -= 1) {
          const period = firstDayOfMonthsAgo(monthsAgo);
          const amount = computeInvoiceAmount(group.monthlyFee, enrollment.discountPercent);
          const dueDate = toDateOnly(addDays(period, 9));
          const roll = pseudoRandom(seed++);
          const paidAmount = monthsAgo === 0 ? (roll < 0.5 ? amount : 0) : roll < 0.8 ? amount : roll < 0.9 ? roundMoney(amount / 2) : 0;
          const invoice = await invoiceRepo.save(
            invoiceRepo.create({
              number: `INV-${monthKey(period).replace('-', '')}-${String(invoiceCounter++).padStart(5, '0')}`,
              studentId: enrollment.studentId,
              groupId: group.id,
              enrollmentId: enrollment.id,
              periodMonth: toDateOnly(period),
              amount,
              paidAmount,
              dueDate,
              status: resolveInvoiceStatus({ amount, paidAmount, dueDate, status: InvoiceStatus.PENDING }, today),
              description: `${group.name} fee for ${monthKey(period)}`,
            }),
          );
          if (paidAmount > 0) {
            const paidAt = addDays(period, 2 + Math.floor(pseudoRandom(seed++) * 6));
            const payment = await paymentRepo.save(
              paymentRepo.create({
                number: `PAY-${monthKey(period).replace('-', '')}-${String(paymentCounter++).padStart(5, '0')}`,
                studentId: enrollment.studentId,
                invoiceId: invoice.id,
                groupId: group.id,
                amount: paidAmount,
                method: pseudoRandom(seed++) < 0.6 ? PaymentMethod.CASH : PaymentMethod.CARD,
                status: PaymentStatus.COMPLETED,
                paidAt,
                description: `Payment for ${invoice.number}`,
                receivedById: cashier?.id ?? null,
              }),
            );
            await allocationRepo.save(
              allocationRepo.create({ paymentId: payment.id, invoiceId: invoice.id, amount: paidAmount }),
            );
          }
        }
      }
    }
  },
};
