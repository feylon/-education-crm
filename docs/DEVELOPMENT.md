# Ishlab chiqish qo'llanmasi

## Talablar

Node.js 20+, npm 10+, Docker (PostgreSQL va Redis uchun) yoki lokal o'rnatilgan PostgreSQL 16 va Redis 7.

## Birinchi ishga tushirish

```bash
cp .env.example .env
# lokal dev qiymatlari:
#   POSTGRES_HOST=localhost  POSTGRES_PORT=5433  REDIS_HOST=localhost  REDIS_PORT=6380
docker compose -f docker-compose.dev.yml up -d

cd backend && npm install
npm run migrate && npm run seed
npm run start:all

cd ../frontend && npm install
npm run dev
```

http://localhost:5173 ni oching va `admin@crm.local` / `Password123!` bilan kiring.
Swagger: http://localhost:3000/api/docs.

## Kundalik ish tartibi

1. Entitylarni yarating yoki o'zgartiring → `npm run migration:generate -- libs/database/src/migrations/<Nomi>` →
   SQL ni ko'rib chiqing → `npm run migration:run`.
2. `libs/common/src/dto` da DTO'larni, `constants/patterns.ts` da patternlarni qo'shing/o'zgartiring.
3. Servis handlerini, so'ng `@RequirePermissions` li gateway controllerini yozing.
4. Frontendda API modul va sahifa qo'shing; i18n kalitlarini **uchala** til fayliga qo'shing.
5. Ikkala loyihada `npm run typecheck`, so'ng `npm test`, `npm run test:e2e` ni bajaring.

## Servislarning bir qismini ishga tushirish

```bash
node scripts/start-all.js gateway auth-service student-service
```

Lokal health endpointlar: gateway `http://localhost:3000/api/v1/health`, servislar
`http://localhost:31xx/health` (3101 auth … 3112 file).

## Testlar

- Unit testlar: kod yonidagi `*.spec.ts` (`npm test`). `libs/common/src/domain` dagi biznes qoidalari,
  `AuthService` (login, refresh rotatsiyasi, qayta ishlatishni aniqlash), `TokenService`,
  `RpcClientService`, `PermissionsGuard`, `AllExceptionsFilter`, `ResponseInterceptor`.
- E2E: `apps/gateway/test/gateway.e2e-spec.ts` gateway ni mock RPC klient bilan ko'taradi va
  konvertlar, validatsiya, 401/403/404 xatti-harakati hamda meta uzatilishini tekshiradi (`npm run test:e2e`).

## Seedlar

`npm run seed` idempotent; ruxsat katalogi o'zgarganidan keyin qayta bajaring. Faqat rollar va
ruxsatlar uchun `SEED_DEMO_DATA=false npm run seed`.

## Lint va format

```bash
cd backend && npm run lint && npm run format
cd frontend && npm run lint
```

## Muammolar

- `503 Service handling x is unavailable` → servis ishlamayapti yoki Redis ga ulanmagan.
- `ECONNREFUSED 5432/6379` → infratuzilma ishga tushmagan yoki `.env` da portlar noto'g'ri.
- Frontendda 401 takrorlanadi → `localStorage` da eski tokenlar; chiqing yoki storage ni tozalang.
