# Docker

## Imagelar

### Backend (`backend/Dockerfile`)
Ko'p bosqichli: `node:20-alpine` bog'liqliklarni o'rnatadi, monorepo ni kompilyatsiya qiladi
(`npm run build`), dev bog'liqliklarni olib tashlaydi; runtime bosqichi `dist/` va `node_modules/` ni
nusxalaydi, root bo'lmagan foydalanuvchi sifatida `node dist/apps/${SERVICE}/src/main.js` ni ishga
tushiradi. Bitta image barcha servislar va migrator uchun ishlatiladi; compose har bir konteyner uchun
buyruqni belgilaydi. Health checklar uchun `wget` o'rnatilgan.

### Frontend (`frontend/Dockerfile`)
`node:20-alpine` Vite bundle ni quradi; `nginx:1.27-alpine` uni `docker/nginx.conf` (compose orqali
ulanadi) bilan tarqatadi: SPA fallback, gzip, `/assets` uchun uzoq muddatli kesh, `/api/` va
`/socket.io/` (WebSocket upgrade) ni `gateway:3000` ga reverse proxy, `/healthz` endpoint.

## Compose fayllari

| Fayl | Vazifasi |
| --- | --- |
| `docker-compose.yml` | to'liq stek: postgres, redis, migrator, gateway, 12 ta servis, frontend |
| `docker-compose.dev.yml` | lokal ishlab chiqish uchun PostgreSQL (host port 5433) va Redis (host port 6380) |

### Ishga tushish tartibi

```text
postgres (healthy) ─┬─► migrator (migratsiya + seed, 0 bilan tugaydi) ─► barcha servislar (healthy) ─► frontend
redis (healthy)    ─┘
```

`depends_on` infratuzilma uchun `service_healthy`, migrator uchun `service_completed_successfully`
ishlatadi. Har bir servisda health check bor (`3001` da `/health`; gateway `/api/v1/health`).

### Volumelar

`postgres_data`, `redis_data`, `uploads_data` (file-service saqlash joyi `/data/uploads`).

### Portlar

| Konteyner | Host port (sukut) | O'zgaruvchi |
| --- | --- | --- |
| frontend | 8080 | `FRONTEND_PORT` |
| gateway | 3000 | `GATEWAY_PORT` |

To'liq stek infratuzilma portlarini ochmaydi; PostgreSQL yoki Redis ga hostdan kirish kerak bo'lsa dev
compose faylidan foydalaning.

## Buyruqlar

```bash
docker compose build                 # backend va frontend imagelarini qurish
docker compose up -d                 # hammasini ishga tushirish
docker compose ps                    # holat va health
docker compose logs -f gateway       # bitta servis loglarini kuzatish
docker compose run --rm migrator     # migratsiya va seedni qayta bajarish
docker compose down                  # to'xtatish (volumelar saqlanadi)
docker compose down -v               # to'xtatish va ma'lumotlarni o'chirish
```

Muhit qiymatlari loyiha ildizidagi `.env` dan olinadi (`.env.example` ga qarang). Tarmoq ichida servislar
doimo `postgres:5432` va `redis:6379` dan foydalanadi.
