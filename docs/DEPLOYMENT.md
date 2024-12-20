# Deploy

## Docker Compose bilan bitta serverga

1. Serverga Docker va Compose v2 o'rnating.
2. Repozitoriyni klonlang va `.env.example` dan `.env` yarating. Kuchli `JWT_SECRET` va
   `JWT_REFRESH_SECRET` (32+ tasodifiy belgi), kuchli `POSTGRES_PASSWORD`, `CORS_ORIGINS` ni ommaviy
   originga, toza baza uchun `SEED_DEMO_DATA=false` (rollar va ruxsatlar baribir seed qilinadi) va
   ixtiyoriy Telegram bot tokenini qo'ying.
3. `docker compose build && docker compose up -d`.
4. `frontend` (8080 port) oldiga TLS tugatuvchi reverse proxy (nginx, Caddy, Traefik) qo'ying. Frontend
   konteyneri `/api` va `/socket.io` ni gateway ga proxylaydi, shuning uchun bitta ommaviy port yetarli.
5. Birinchi administratorni yarating: `SEED_DEMO_DATA=false` bo'lsa demo foydalanuvchilar bo'lmaydi;
   toza bazada seedni demo ma'lumotlar bilan bir marta bajarib super admin parolini darhol o'zgartiring,
   yoki vaqtinchalik demo super admin orqali `POST /users` bilan foydalanuvchi yarating va demo
   hisoblarni o'chiring.

## Yangilash

```bash
git pull
docker compose build
docker compose up -d          # migrator servislar qayta ishga tushishidan oldin yangi migratsiyalarni bajaradi
```

## Zaxira nusxalar

- PostgreSQL: `docker compose exec postgres pg_dump -U postgres education_crm > backup.sql`.
- Yuklangan fayllar: `uploads_data` volumeni zaxiralang.

## Masshtablash

- file-service saqlash joyidan tashqari barcha servislar holatsiz; Redis transport orqali gorizontal
  masshtablash mumkin (`docker compose up -d --scale student-service=2`).
- Rejalashtirilgan joblar `payment-service` va `notification-service` ichida ishlaydi; bu ikkisini bitta
  nusxada saqlang yoki masshtablashdan oldin taqsimlangan qulf qo'shing.
- Telegram bot `getUpdates` ni poll qiladi; bitta tokenni faqat bitta jarayon poll qilishi mumkin.

## Kuzatuv

- `GET /api/v1/health` (gateway) va har bir servisning 3001 portidagi `GET /health`.
- Loglar stdout/stderr ga yoziladi; `docker compose logs` yoki log driver orqali yig'ing.
- Audit jurnali (`/settings/audit`) har bir biznes o'zgarishini ijrochi, ip va user agent bilan saqlaydi.

## Xavfsizlik ro'yxati

- Secretlar faqat `.env` da yoki orkestratorning secret omborida; hech qachon imagelarda emas.
- Barcha sessiyalarni bekor qilish uchun JWT secretlarni almashtiring.
- `CORS_ORIGINS` ni haqiqiy frontend origini bilan cheklang.
- API hujjati ochiq bo'lmasligi kerak bo'lsa ommaviy o'rnatishlarda `SWAGGER_ENABLED=false` qiling.
