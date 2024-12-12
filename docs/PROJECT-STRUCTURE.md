# Loyiha strukturasi

```text
education-crm/
├── backend/                         NestJS monorepo
│   ├── apps/
│   │   ├── gateway/                 HTTP API, Swagger, guardlar, WebSocket, e2e testlar
│   │   │   ├── src/common/          dekoratorlar, guardlar, strategiyalar, filtrlar, interceptorlar, swagger yordamchilari
│   │   │   ├── src/modules/<m>/     har bir biznes soha uchun controller moduli
│   │   │   ├── src/websocket/       Socket.IO gateway + bildirishnoma hodisasi iste'molchisi
│   │   │   └── test/                jest e2e konfiguratsiyasi va testlar
│   │   ├── auth-service/            login, refresh rotatsiyasi, logout, me, parolni o'zgartirish
│   │   ├── user-service/            foydalanuvchilar, rollar, ruxsatlar, audit jurnali
│   │   ├── student-service/         o'quvchilar, ota-onalar, profil agregatsiyasi
│   │   ├── teacher-service/         o'qituvchilar, profil, panel
│   │   ├── course-service/          kurslar, kategoriyalar
│   │   ├── group-service/           guruhlar, biriktirishlar, statistika
│   │   ├── schedule-service/        filiallar, xonalar, slotlar, to'qnashuvlar, kalendar
│   │   ├── attendance-service/      darslar, generatsiya, belgilash, statistika
│   │   ├── payment-service/         invoyslar, to'lovlar, taqsimlash, qarz, billing joblari
│   │   ├── notification-service/    hodisa iste'molchilari, eslatma joblari, Telegram bot
│   │   ├── report-service/          panel va hisobotlar
│   │   ├── file-service/            fayllarni saqlash
│   │   └── migrator/                bir martalik migratsiya + seed
│   ├── libs/
│   │   ├── common/src/
│   │   │   ├── audit/               AuditPublisher
│   │   │   ├── bootstrap/           bootstrapMicroservice (Redis transport + health server)
│   │   │   ├── config/              Joi env sxemalari, Redis transport sozlamalari
│   │   │   ├── constants/           message patternlar, hodisa nomlari, ruxsat katalogi, standart rollar
│   │   │   ├── domain/              sof biznes qoidalari + unit testlar
│   │   │   ├── dto/                 gateway va servislar uchun umumiy DTO'lar
│   │   │   ├── enums/               holatlar, rollar, usullar
│   │   │   ├── interfaces/          RequestMeta, Paginated, JwtPayload, hodisa payloadlari
│   │   │   ├── rpc/                 RpcClientModule/Service, RpcHttpException oilasi
│   │   │   └── utils/               pagination, sanalar, kirish cheklovi, DB xatolari tarjimasi
│   │   └── database/src/
│   │       ├── entities/            22 ta TypeORM entity
│   │       ├── migrations/          TypeORM migratsiyalari
│   │       ├── seeds/               rollar/ruxsatlar seedi, demo ma'lumotlar seedi
│   │       ├── data-source.ts       CLI data source
│   │       ├── database.module.ts   TypeOrmModule.forRootAsync
│   │       └── typeorm.config.ts    umumiy DataSourceOptions quruvchisi
│   ├── scripts/start-all.js         barcha ilovalarni ts-node bilan lokal ishga tushiradi
│   ├── Dockerfile                   barcha servislar uchun ko'p bosqichli image
│   ├── nest-cli.json                monorepo loyihalar xaritasi
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                     tipli API modullari + refresh interceptorli axios klient
│   │   ├── components/ui/           o'z UI kit (button, input, select, table, modal, drawer, …)
│   │   ├── components/layout/       sidebar, header, breadcrumbs, til almashtirgich, qo'ng'iroq, foydalanuvchi menyusi
│   │   ├── components/charts/       Chart.js o'ramlari
│   │   ├── composables/             pagination, formalar, toast, confirm, ruxsatlar, formatlash
│   │   ├── i18n/locales/            uz.ts, en.ts, ru.ts
│   │   ├── router/                  marshrutlar, guardlar, menyu
│   │   ├── stores/                  Pinia: auth, ui, notifications (Socket.IO)
│   │   ├── styles/                  SCSS tokenlar va asosiy stillar
│   │   └── views/<modul>/           sahifalar va sahifa darajasidagi modallar
│   ├── Dockerfile                   build + nginx image
│   └── vite.config.ts
├── docker/nginx.conf                SPA + reverse proxy sozlamasi
├── docker-compose.yml               to'liq stek
├── docker-compose.dev.yml           lokal ishlab chiqish uchun PostgreSQL + Redis
├── docs/                            ushbu hujjatlar
├── .env.example
└── README.md
```

## Nomlash qoidalari

- Message patternlar: `<modul>.<amal>` (`students.findAll`, `payments.refund`), bir joyda —
  `libs/common/src/constants/patterns.ts`.
- Hodisalar: `<entity>.<o'tganZamonAmal>` (`payment.created`), `constants/events.ts` da.
- Ruxsatlar: `<modul>.<amal>` (`students.read`), katalog `constants/permissions.ts` da.
- Gateway controller modullari REST resurslarga, servis modullari esa baza egaligiga mos keladi.
