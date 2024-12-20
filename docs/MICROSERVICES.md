# Mikroservislar

Barcha servislar `backend` monorepo dagi NestJS ilovalari bo'lib, `bootstrapMicroservice`
(`libs/common/src/bootstrap`) orqali ishga tushadi. Har biri Redis transportida tinglaydi va Docker
health checklar uchun kichik HTTP health endpoint (`HEALTH_PORT`, sukut 3001, `GET /health`) ochadi.

| Servis | Egalik qiladi | Message patternlar (prefiks) | Chiqaradi |
| --- | --- | --- | --- |
| gateway | – | hammasini iste'mol qiladi; `notification.created` → WebSocket | – |
| auth-service | refresh_tokens | `auth.*` | `audit.log`, `user.loggedIn` |
| user-service | users, roles, permissions, audit_logs | `users.*`, `roles.*`, `permissions.*`, `audit.findAll`; `audit.log` ni iste'mol qiladi | `audit.log` |
| student-service | students, parents | `students.*` | `student.created|updated|deleted`, `audit.log` |
| teacher-service | teachers | `teachers.*` | `teacher.created`, `audit.log` |
| course-service | courses, course_categories | `courses.*` | `audit.log` |
| group-service | groups, group_students | `groups.*` | `group.created|updated`, `group.studentEnrolled|studentLeft`, `audit.log` |
| schedule-service | branches, rooms, schedules | `schedules.*`, `rooms.*`, `branches.*` | `audit.log` |
| attendance-service | lessons, attendance_records | `lessons.*`, `attendance.*` | `attendance.marked`, `audit.log` |
| payment-service | invoices, payments, payment_allocations | `payments.*`, `invoices.*` | `payment.created|refunded`, `invoice.created|overdue`, `audit.log` |
| notification-service | notifications | `notifications.*`; biznes hodisalarini iste'mol qiladi | `notification.created` |
| report-service | – (faqat o'qish agregatlari) | `reports.*` | – |
| file-service | files | `files.*` | `audit.log` |
| migrator | – | bir martalik jarayon | – |

Pattern va hodisa nomlari `libs/common/src/constants/{patterns,events}.ts` dagi konstantalar.

## Muloqot

- **So'rov/javob**: gateway `RpcClientService.send(pattern, { meta, data })` ni chaqiradi. 15 s timeout
  (→ 503), servislar tashlagan `{ statusCode, message, errors }` payloadlari (`RpcHttpException` va
  uning avlodlari) xuddi shu statusli `HttpException` ga aylantiriladi.
- **Hodisalar**: `RpcClientService.emit(event, payload)` — yuborib unutish. Bitta hodisaga bir nechta
  servis obuna bo'lishi mumkin; Redis transportida har bir obunachi uni oladi.
- **Meta**: `RequestMeta` (foydalanuvchi id, email, rollar, ruxsatlar, ip, user agent) har bir so'rovga
  biriktiriladi — servislar ma'lumotlarni cheklaydi va audit yozadi.

## Rejalashtirilgan joblar

| Servis | Job | Jadval |
| --- | --- | --- |
| payment-service | faol biriktirishlar uchun oylik invoyslar yaratish | har oyning 1-kuni, 01:00 |
| payment-service | muddati o'tgan invoyslarni belgilash va `invoice.overdue` chiqarish | har kuni 02:00 |
| notification-service | o'quvchi/ota-onalarga qarz eslatmasi va moliya xodimlariga xulosa | har kuni 09:00 |
| notification-service | 3 kun ichida to'lanishi kerak bo'lgan invoyslar haqida eslatma | har kuni 10:00 |

## Telegram bot

`TELEGRAM_BOT_ENABLED=true` bo'lganda `notification-service` Telegram Bot API ni long polling qiladi.
Buyruqlar: `/start` (kontakt tugmasi orqali telefon raqamini so'raydi; user, student va/yoki parent
yozuvlarini bog'laydi), `/status` (bog'langan har bir o'quvchi uchun hisoblangan, to'langan, qarz),
`/unlink`, `/help`. Bog'langan chatli foydalanuvchiga yo'naltirilgan bildirishnomalar hamda o'quvchiga
tegishli to'lov/invoys/davomat/qarz hodisalari bog'langan Telegram chatlarga (o'quvchi va ota-onalar)
ham yuboriladi.

## Yangi servis qo'shish

1. `apps/<nom>-service` yarating: `main.ts` (`bootstrapMicroservice(AppModule, 'Nom')`),
   `app.module.ts` (ConfigModule + DatabaseModule + RpcClientModule) va feature modul.
2. Pattern/hodisalarni `libs/common/src/constants` ga, DTO'larni `libs/common/src/dto` ga qo'shing.
3. Gateway controller modulini qo'shing va `apps/gateway/src/app.module.ts` da ro'yxatdan o'tkazing.
4. Loyihani `nest-cli.json` da ro'yxatdan o'tkazing, `scripts/start-all.js` va `docker-compose.yml` ga qo'shing.
