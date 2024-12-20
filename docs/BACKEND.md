# Backend

`backend/` dagi NestJS 10 monorepo (`nest-cli.json` da 14 ta ilova va 2 ta kutubxona).

## Kutubxonalar

### `@app/common` (`libs/common`)
- `constants` — message patternlar, hodisa nomlari, ruxsat katalogi, standart rollar, limitlar.
- `dto` — Swagger dekoratorli class-validator DTO'lar; gateway va servislar uchun umumiy.
- `enums`, `interfaces` — holatlar, `RequestMeta`, `Paginated`, `JwtPayload`, hodisa payloadlari.
- `rpc` — `RpcClientModule` (Redis `ClientProxy`), `RpcClientService` (timeout + xato tarjimasi),
  `RpcHttpException` oilasi (`RpcNotFoundException`, `RpcBadRequestException`, `RpcConflictException`, …).
- `domain` — sof biznes qoidalari: `computeInvoiceAmount`, `allocatePayment`, `resolveInvoiceStatus`,
  `computeBalance`, `detectConflicts`, `summarizeAttendance`.
- `utils` — `paginateQuery`/`applySorting`, sana yordamchilari, `translateDatabaseError` (unikal/tashqi
  kalit buzilishlari → 409/400), kirish cheklovi yordamchilari.
- `config` — Joi sxemalari (`serviceEnvSchema`, `gatewayEnvSchema`, `authEnvSchema`) va Redis sozlamalari.
- `audit` — `AuditPublisher.publish(meta, action, entity, id, old, new)`.
- `bootstrap` — `bootstrapMicroservice(module, name)`.

### `@app/database` (`libs/database`)
Entitylar, `DatabaseModule` (`TypeOrmModule.forRootAsync`), `buildDataSourceOptions`, CLI uchun
`data-source.ts`, migratsiyalar va seedlar.

## Gateway

- `main.ts`: Helmet, CORS (`CORS_ORIGINS`), global prefiks `api/v1`, validation pipe (whitelist +
  transform), Swagger (`/api/docs`), hodisalarni iste'mol qilish uchun hybrid Redis mikroservis.
- Global providerlar: `ThrottlerGuard`, `JwtAuthGuard` (`@Public()` ni o'tkazib yuboradi),
  `PermissionsGuard`, `ResponseInterceptor`, `AllExceptionsFilter`.
- Controllerlar `RpcClientService.send(PATTERN, { meta, data })` ni chaqiradi; `@Meta()` so'rovdan
  `RequestMeta` tuzadi.
- `websocket/NotificationsGateway` soketlarni access token bilan autentifikatsiya qiladi va
  `notification` hodisalarini yuboradi; `EventsController` `notification.created` ni iste'mol qiladi.
- `modules/files` multipart yuklashlarni (rasm va PDF, `MAX_FILE_SIZE_MB` limiti) qabul qiladi va
  yuklab olishlarni oqimlaydi.

## Servis anatomiyasi

```text
apps/<nom>-service/src/
├── main.ts                 bootstrapMicroservice(AppModule, 'XService')
├── app.module.ts           ConfigModule (Joi) · DatabaseModule · RpcClientModule.register() · feature modul
└── <feature>/
    ├── <feature>.module.ts TypeOrmModule.forFeature([...]) · providerlar · AuditPublisher
    ├── <feature>.controller.ts  @MessagePattern / @EventPattern handlerlar, payload WithMeta<Dto>
    └── *.service.ts        biznes mantiq, cheklash, audit, hodisalar
```

Servislar `RpcHttpException` tashlaydi; baza cheklovlari buzilishi `translateDatabaseError` orqali
o'tadi. Ko'p qatorli yozishlar `DataSource.transaction` ichida.

## Skriptlar

```bash
npm run start:all                # barcha ilovalar ts-node bilan (lokal dev)
npm run start:gateway            # yoki istalgan bitta ilova, package.json ga qarang
npm run build                    # tsc + tsc-alias → dist/
npm run typecheck
npm run lint                     # eslint (no-explicit-any = error)
npm test | npm run test:cov      # unit testlar
npm run test:e2e                 # gateway integratsion testlari
npm run migrate | npm run seed   # migrator ilovasi
npm run migration:generate|run|revert
```

## Kod qoidalari

- Manba fayllarda comment yo'q; ma'noni nomlar va struktura beradi.
- `any` yo'q; DTO'lar tipli va validatsiyali; `unknown` aniq toraytiriladi.
- Har bir o'zgartiruvchi handler audit yozuvini va kerak bo'lsa domen hodisasini chiqaradi.
- Saralash ustunlari har bir servis uchun oq ro'yxatda (`SORTABLE`), qidiruv belgilangan ustunlarda `ILIKE` ishlatadi.
