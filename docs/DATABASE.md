# Ma'lumotlar bazasi

PostgreSQL 16, bitta baza, bitta sxema, TypeORM migratsiyalari bilan boshqariladi (`synchronize: false`).
Entitylar `backend/libs/database/src/entities` da; har bir jadvalda `id uuid`, `createdAt`, `updatedAt`
bor, soft delete qilinadigan jadvallarda `deletedAt` ham mavjud.

## Jadvallar va egalari

| Jadval | Egasi (servis) | Izoh |
| --- | --- | --- |
| users | user-service | o'chirilmagan yozuvlar orasida `email` unikal, `passwordHash` sukut bo'yicha tanlanmaydi, `telegramChatId` |
| roles | user-service | `name` unikal, `isSystem` standart rollarni himoya qiladi |
| permissions | user-service | `code` unikal (`modul.amal`) |
| role_permissions, user_roles | user-service | bog'lovchi jadvallar |
| refresh_tokens | auth-service | `tokenHash` unikal (sha256), `expiresAt`, `revokedAt` |
| audit_logs | user-service | `userId`, `action`, `entity`, `entityId`, `oldValue`/`newValue` jsonb, `ip`, `userAgent` |
| branches | schedule-service | soft delete |
| rooms | schedule-service | unikal (`branchId`, `name`) |
| course_categories | course-service | unikal `name` |
| courses | course-service | `price numeric(12,2)` = oylik to'lov, `status`, `color` |
| students | student-service | unikal `phone` va ixtiyoriy unikal `userId`, pasport maydonlari, favqulodda aloqa, `telegramChatId` |
| parents | student-service | o'quvchiga tegishli, `isPrimary`, `telegramChatId` |
| teachers | teacher-service | `userId` bilan birga-bir, maosh turi/miqdori, holat |
| groups | group-service | kurs, o'qituvchi, xona, filial, sanalar, `monthlyFee`, `capacity`, holat |
| group_students | group-service | unikal (`groupId`, `studentId`), `discountPercent`, holat ACTIVE/LEFT/COMPLETED |
| schedules | schedule-service | haftalik slot: `weekday` 1–7, `startTime`, `endTime`, amal qilish davri |
| lessons | attendance-service | unikal (`groupId`, `date`, `startTime`), holat PLANNED/COMPLETED/CANCELLED |
| attendance_records | attendance-service | unikal (`lessonId`, `studentId`), holat PRESENT/ABSENT/LATE/EXCUSED |
| invoices | payment-service | unikal `number`, unikal (`enrollmentId`, `periodMonth`), `amount`, `paidAmount`, `dueDate`, holat |
| payments | payment-service | unikal `number`, `method`, holat COMPLETED/REFUNDED/CANCELLED |
| payment_allocations | payment-service | unikal (`paymentId`, `invoiceId`), qo'llangan summa |
| notifications | notification-service | foydalanuvchi bo'yicha, `type`, `title`, `body`, `data` jsonb, `isRead` |
| files | file-service | saqlangan fayl metama'lumotlari, nisbiy `path` |

## Munosabatlar

```text
users 1─1 teachers        users 0..1─1 students        users *─* roles *─* permissions
branches 1─* rooms        course_categories 1─* courses
courses 1─* groups        teachers 1─* groups           rooms 1─* groups
groups 1─* group_students *─1 students                 students 1─* parents
groups 1─* schedules      groups 1─* lessons            schedules 0..1─* lessons
lessons 1─* attendance_records *─1 students
students 1─* invoices     group_students 0..1─* invoices
students 1─* payments     payments 1─* payment_allocations *─1 invoices
users 1─* notifications   users 1─* refresh_tokens
```

Cascade strategiyasi: ota-onasiz ma'nosi yo'q bolalar yozuvlari (`parents`, `group_students`,
`schedules`, `lessons`, `attendance_records`, `payment_allocations`, `refresh_tokens`, `notifications`)
o'chirishda cascade qilinadi; saqlanishi shart bo'lgan havolalar (guruhning `courses` i, xonaning
`branch` i) RESTRICT; ixtiyoriy havolalar (`teacher`, `room`, `branch`, `category`) SET NULL.

## Indekslar

Primary key va unikal cheklovlardan tashqari, filtrlarda ishlatiladigan tashqi kalitlar (`studentId`,
`groupId`, `teacherId`, `lessonId`, `invoiceId`, `userId`), holat ustunlari, sanalar (`lessons.date`,
`invoices.periodMonth`, `invoices.dueDate`, `payments.paidAt`) va `audit_logs(entity, entityId)`
indekslangan. Qisman unikal indekslar (`WHERE "deletedAt" IS NULL`) soft delete dan keyin telefon
raqam yoki nomni qayta ishlatishga imkon beradi.

## Pul va kasr sonlar

Pul ustunlari `numeric(12,2)` bo'lib, `decimalTransformer` orqali JavaScript sonlariga aylantiriladi;
yaxlitlash billing domen yordamchilaridagi `roundMoney` orqali bajariladi.

## Migratsiyalar

```bash
cd backend
npm run migration:generate -- libs/database/src/migrations/<Nomi>   # bazaga ulanish kerak
npm run migration:run
npm run migration:revert
```

Migrator ilovasi (`apps/migrator`) `runMigrations` ni, so'ng seederlarni bajaradi; `docker compose up`
uni servislardan oldin ishga tushiradi.

## Seedlar

- `rolesSeed` ruxsat katalogini va oltita standart rolni ularning ruxsatlari bilan upsert qiladi.
- `demoSeed` demo xodimlar, uchta o'qituvchi, ota-onalari bilan o'n sakkizta o'quvchi, to'rt xonali
  filial, kategoriyalar va kurslar, haftalik slotlari bilan to'rtta guruh, so'nggi uch oy uchun darslar
  va davomat, invoyslar va to'lovlarni yaratadi. Idempotent — mavjud yozuvlarni o'tkazib yuboradi.

Demo hisoblar README da (`Password123!`).
