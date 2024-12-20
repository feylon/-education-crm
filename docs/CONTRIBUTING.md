# Hissa qo'shish

## Ish tartibi

1. `main` dan branch yarating.
2. Quyidagi qoidalarga amal qilib o'zgarishni amalga oshiring; testlarni qo'shing yoki yangilang.
3. `backend/` da: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`;
   `frontend/` da: `npm run typecheck`, `npm run build`.
4. Xatti-harakat, endpointlar, muhit o'zgaruvchilari yoki struktura o'zgarsa `docs/` dagi hujjatlarni yangilang.
5. O'zgarish va u qanday tekshirilgani haqida qisqa tavsif bilan pull request oching.

## Qoidalar

- **Kodda comment yo'q.** Niyatni nomlar, kichik funksiyalar va tiplar orqali ifodalang.
- **`any` yo'q.** `unknown` va toraytirishni afzal ko'ring; DTO'lar class-validator dekoratorli klasslar.
- **Har bir jadvalga bitta yozuvchi.** Servislar faqat o'z jadvallariga yozadi (`docs/DATABASE.md` ga
  qarang); boshqa servislar umumiy entitylar orqali o'qiydi.
- **Pattern va hodisalar — konstantalar.** Ularni `libs/common/src/constants` ga qo'shing.
- **Ruxsatlar** `permissions.ts` dagi katalogning qismi; ularni `roles.ts` dagi tegishli standart
  rollarga qo'shing va yangi endpointlarni `@RequirePermissions` bilan himoyalang.
- **Audit**: har bir yaratish, yangilash, o'chirish va maxfiy amalni `AuditPublisher` bilan yozing;
  audit payloadlariga secretlarni kiritmang.
- **i18n**: foydalanuvchiga ko'rinadigan har bir matn `t(...)` orqali; kalitlarni `uz.ts`, `en.ts` va
  `ru.ts` ga bir xil struktura bilan qo'shing.
- **Stillar**: `styles/_tokens.scss` tokenlari bilan SCSS; avval desktop, kichik ekranlar uchun
  `@include down($bp)`.
- **Commitlar**: o'zgarishni tasvirlovchi qisqa buyruq maylidagi sarlavha (ushbu repozitoriy tarixi
  o'zbekcha sarlavhalardan foydalanadi, masalan `payment-service: to'lovlar, FIFO taqsimlash`).

## Testlar

Biznes qoidalari `libs/common/src/domain` da unit testlar bilan qoplanadi; bazaga bog'liq servis mantiqi
mock RPC qatlamli gateway e2e to'plami yoki seed qilingan bazada qo'lda tekshiruv orqali qoplanadi. Yangi
API endpointlar kamida autentifikatsiya va ruxsat xatti-harakati bo'yicha e2e to'plamida tekshirilishi kerak.
