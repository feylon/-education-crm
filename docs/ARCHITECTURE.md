# Arxitektura

## Umumiy ko'rinish

![Boshqaruv paneli](screenshots/02-dashboard.png)

Education CRM ikki qismdan iborat: Vue 3 single-page ilova va API Gateway hamda Redis orqali muloqot
qiluvchi o'n ikki mikroservisdan tashkil topgan NestJS backend. Barcha servislar umumiy TypeORM entity
kutubxonasi orqali bitta PostgreSQL bazasidan foydalanadi; har bir jadvalga faqat bitta servis yozadi.

```text
┌──────────────┐    HTTPS     ┌──────────────────────────┐
│  Vue 3 SPA   │ ───────────► │  nginx (statik + proxy)  │
└──────────────┘              └────────────┬─────────────┘
                                /api/v1    │   /socket.io
                                           ▼
                              ┌──────────────────────────┐
                              │        API Gateway       │  Helmet, CORS, throttling, JWT,
                              │  REST · Swagger · WS     │  permission guard, konvertlar
                              └────────────┬─────────────┘
                                           │  so'rov/javob + hodisalar (Redis transport)
          ┌───────────┬───────────┬────────┼─────────┬──────────┬───────────┬──────────┐
          ▼           ▼           ▼        ▼         ▼          ▼           ▼          ▼
        auth        user       student  teacher   course     group     schedule  attendance
          ▼           ▼           ▼        ▼         ▼          ▼           ▼          ▼
       payment  notification   report    file   ─────────────── PostgreSQL ───────────────
                 (+Telegram)
```

## So'rov oqimi

1. Brauzer `/api/v1/...` ga Bearer access token bilan murojaat qiladi.
2. Gateway tokenni tekshiradi (`JwtStrategy`), kerakli ruxsatlarni (`PermissionsGuard`), body/query ni
   (`ValidationPipe`) tekshiradi va `RequestMeta` obyektini (foydalanuvchi id, email, rollar, ruxsatlar,
   ip, user agent) tuzadi.
3. Controller `students.findAll` kabi message pattern ni `{ meta, data }` bilan `RpcClientService`
   orqali yuboradi; u timeout qo'yadi va `RpcException` javoblarini HTTP xatolarga aylantiradi.
4. Egalik qiluvchi mikroservis patternni qayta ishlaydi, ma'lumotlarni cheklaydi (o'qituvchi faqat o'z
   guruhlarini, o'quvchi faqat o'z yozuvlarini ko'radi), PostgreSQL ga yozadi, `audit.log` va domen
   hodisalarini chiqaradi va natijani qaytaradi.
5. Gateway natijani `{ success: true, statusCode, data }` ko'rinishida o'raydi.

## Hodisalar

Domen hodisalari (`student.created`, `payment.created`, `group.studentEnrolled`, `attendance.marked`,
`invoice.created`, `invoice.overdue`, …) `ClientProxy.emit` bilan chiqariladi va quyidagilar tomonidan
qabul qilinadi:

- `user-service` — `audit.log` → `audit_logs` jadvaliga saqlanadi.
- `notification-service` — barcha biznes hodisalar → `notifications` yozuvlari, `notification.created`
  hodisalari, Telegram xabarlari.
- `gateway` — `notification.created` → `user:<id>` xonasiga Socket.IO orqali yuboriladi.

## Hisob-kitob modeli

- `Course.price` — oylik to'lov; `Group.monthlyFee` sukut bo'yicha unga teng, o'zgartirish mumkin.
- Biriktirish (`group_students`) chegirma foizini saqlaydi.
- Invoyslar har bir faol biriktirish uchun har oy yaratiladi. Summa = to'lov × (1 − chegirma).
- To'lovlar tanlangan invoysga yoki FIFO tartibida eng eski ochiq invoyslarga taqsimlanadi
  (`payment_allocations`). Taqsimlanmay qolgan oldindan to'lov (kredit) yangi invoys yaratilganda
  avtomatik qo'llanadi. Raqamlash va oylik generatsiya PostgreSQL advisory lock bilan himoyalangan. Invoys holati: PENDING → PARTIALLY_PAID → PAID, muddat o'tgach OVERDUE.
  Balans = to'lovlar − invoyslar; qarz = max(0, −balans).

Sof biznes qoidalari (taqsimlash, holatni aniqlash, jadval to'qnashuvi, davomat yig'indisi)
`backend/libs/common/src/domain` da joylashgan va unit testlar bilan qoplangan.

## Jadval va davomat

`Schedule` yozuvi — haftalik slot (guruh, xona, hafta kuni, boshlanish/tugash vaqti, amal qilish davri).
Slot yaratish yoki o'zgartirishda `detectConflicts` shu hafta kunidagi faol guruhlarning barcha slotlari
bilan solishtiradi: o'qituvchi, xona va guruh to'qnashuvlari HTTP 409 bilan rad etiladi. `Lesson`
yozuvlari — slotlardan sana oralig'i uchun generatsiya qilingan yoki qo'lda yaratilgan aniq darslar;
davomat har bir dars va biriktirilgan o'quvchi uchun yoziladi.

## Umumiy masalalar

| Masala | Amalga oshirilishi |
| --- | --- |
| Konfiguratsiya | Joi sxemali `@nestjs/config` (`libs/common/src/config/env.validation.ts`) |
| Logging | Nest `Logger`; gateway kutilmagan xatolarni stack trace bilan yozadi |
| Validatsiya | gateway va servislar uchun umumiy class-validator DTO'lar (`libs/common/src/dto`) |
| Xatolar | servislarda `RpcHttpException` oilasi, gateway da `AllExceptionsFilter` |
| Pagination | `PaginationQueryDto`, `paginateQuery`, `{ items, meta }` |
| Audit | `AuditPublisher` nashr etishdan oldin maxfiy kalitlarni olib tashlaydi |
| Health | gateway `/api/v1/health` (Terminus), servislar `HEALTH_PORT` da `/health` |

## Deploy birliklari

Bitta backend image (`backend/Dockerfile`) `node dist/apps/<servis>/src/main.js` orqali istalgan
servisni ishga tushiradi; `migrator` migratsiya va seedni bir marta bajaradi. Frontend image — Vite
buildini tarqatuvchi va `/api` hamda `/socket.io` ni gateway ga proxylovchi nginx. `docker-compose.yml`
hammasini health checklar va ishga tushish tartibi bilan bog'laydi.
