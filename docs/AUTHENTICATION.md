# Autentifikatsiya

![Kirish sahifasi](screenshots/01-login.png)

## Oqim

```text
POST /api/v1/auth/login { email, password }
  → auth-service: foydalanuvchini topish (passwordHash, rollar, ruxsatlar bilan) → bcrypt.compare
  → access token (15 daqiqa, JWT_SECRET) va refresh token (7 kun, JWT_REFRESH_SECRET, jti) imzolash
  → sha256(refreshToken) ni refresh_tokens ga muddati, ip va user agent bilan saqlash
  → LOGIN auditi, lastLoginAt yangilash
  ← { accessToken, refreshToken, expiresIn, user }

GET  /api/v1/... Authorization: Bearer <accessToken>
  → gateway JwtStrategy imzo/muddatni tekshiradi, type !== 'access' bo'lsa rad etadi

POST /api/v1/auth/refresh { refreshToken }
  → JWT_REFRESH_SECRET bilan tekshirish, hash bo'yicha qidirish, bekor qilingan/muddati o'tgan/begona tokenlarni rad etish
  → ishlatilgan tokenni bekor qilish, yangi juftlik berish (rotatsiya)

POST /api/v1/auth/logout { refreshToken? }
  → shu tokenni, berilmasa foydalanuvchining barcha faol tokenlarini bekor qilish
```

## Token payload

```json
{ "sub": "<userId>", "email": "...", "roles": ["ADMIN"], "permissions": ["students.read", "..."], "type": "access", "iat": 0, "exp": 0 }
```

Refresh tokenlarda `type: "refresh"`, bo'sh rol/ruxsat ro'yxati va `jti` bo'ladi. Gateway refresh
tokenni hech qachon bearer token sifatida qabul qilmaydi.

## Parollar bilan ishlash

- `auth-service`, `user-service`, `student-service` va `teacher-service` da hisob yaratilganda yoki parol
  o'zgartirilganda bcrypt (cost 10) bilan xeshlanadi.
- `users.passwordHash` da `select: false`; faqat login va parol o'zgartirish so'rovlari uni qo'shib oladi.
- `POST /auth/change-password` foydalanuvchining barcha refresh tokenlarini bekor qiladi.
- Audit payloadlari `stripSensitive` dan o'tadi — `password`, `passwordHash`, `tokenHash`,
  `refreshToken` va `accessToken` olib tashlanadi.

## Frontend

- Tokenlar `localStorage` da saqlanadi (`crm.accessToken`, `crm.refreshToken`).
- `src/api/http.ts` bearer headerini qo'shadi, 401 da bitta refresh bajaradi (parallel so'rovlar uchun
  birlashtirilgan), asl so'rovni takrorlaydi yoki refresh muvaffaqiyatsiz bo'lsa tizimdan chiqaradi.
- Socket.IO ulanishi xuddi shu access token bilan autentifikatsiya qilinadi (`auth.token`).

## Tegishli sozlamalar

| O'zgaruvchi | Sukut | Ma'nosi |
| --- | --- | --- |
| JWT_SECRET | majburiy (≥16 belgi) | access token kaliti |
| JWT_REFRESH_SECRET | majburiy (≥16 belgi) | refresh token kaliti |
| JWT_ACCESS_EXPIRES_IN | 15m | access token muddati |
| JWT_REFRESH_EXPIRES_IN | 7d | refresh token muddati |

`/auth/login` uchun rate limit — har bir IP uchun daqiqasiga 10 ta so'rov; `/auth/refresh` — 30 ta.
