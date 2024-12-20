# Muhit o'zgaruvchilari

Barcha o'zgaruvchilar jarayon muhitidan o'qiladi; lokalda ular loyiha ildizidagi `.env` dan keladi
(backend `@nestjs/config` va `dotenv` orqali, Docker Compose esa to'g'ridan-to'g'ri). `.env.example` dan
nusxa oling.

## Baza va Redis

| O'zgaruvchi | Sukut | Kim ishlatadi |
| --- | --- | --- |
| POSTGRES_HOST | postgres (compose) / localhost | barcha servislar, migrator |
| POSTGRES_PORT | 5432 (dev compose bilan 5433) | hammasi |
| POSTGRES_USER | postgres | hammasi |
| POSTGRES_PASSWORD | postgres | hammasi — productionda o'zgartiring |
| POSTGRES_DB | education_crm | hammasi |
| POSTGRES_SSL | false | hammasi |
| REDIS_HOST | redis / localhost | hammasi |
| REDIS_PORT | 6379 (dev compose bilan 6380) | hammasi |
| REDIS_PASSWORD | bo'sh | hammasi |

## Gateway

| O'zgaruvchi | Sukut | Ma'nosi |
| --- | --- | --- |
| GATEWAY_PORT | 3000 | HTTP port |
| CORS_ORIGINS | http://localhost:5173,http://localhost:8080 | vergul bilan ajratilgan ruxsat etilgan originlar |
| THROTTLE_TTL | 60 | rate-limit oynasi (soniya) |
| THROTTLE_LIMIT | 120 | har bir IP uchun oynadagi so'rovlar soni |
| SWAGGER_ENABLED | true | `/api/docs` ni ochish |
| MAX_FILE_SIZE_MB | 5 | yuklash limiti |

## Autentifikatsiya

| O'zgaruvchi | Sukut | Ma'nosi |
| --- | --- | --- |
| JWT_SECRET | majburiy | access token kaliti (kamida 16 belgi) |
| JWT_REFRESH_SECRET | majburiy | refresh token kaliti (kamida 16 belgi) |
| JWT_ACCESS_EXPIRES_IN | 15m | access muddati |
| JWT_REFRESH_EXPIRES_IN | 7d | refresh muddati |

## Servislar

| O'zgaruvchi | Sukut | Ma'nosi |
| --- | --- | --- |
| HEALTH_PORT | 3001 | mikroservis health server porti |
| FILE_STORAGE_PATH | /data/uploads | file-service saqlash katalogi |
| TELEGRAM_BOT_TOKEN | bo'sh | Bot API tokeni |
| TELEGRAM_BOT_ENABLED | false | `true` bo'lsa polling boshlanadi |
| SEED_DEMO_DATA | true | migrator: rollardan tashqari demo ma'lumotlarni ham seed qilish |
| NODE_ENV | development | development / production / test |
| LOG_LEVEL | log | error / warn / log / debug / verbose |

## Frontend (build vaqtida)

| O'zgaruvchi | Sukut | Ma'nosi |
| --- | --- | --- |
| VITE_API_BASE_URL | /api/v1 | API asosiy URL |
| VITE_WS_URL | / | Socket.IO URL |
| FRONTEND_PORT | 8080 | nginx konteynerining host porti (faqat compose) |

Validatsiya: gateway va auth-service majburiy o'zgaruvchi yo'q yoki noto'g'ri bo'lsa ishga tushishda
darhol to'xtaydi (`backend/libs/common/src/config/env.validation.ts` dagi Joi sxemalari).
