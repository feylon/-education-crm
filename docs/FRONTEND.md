# Frontend

`frontend/` dagi Vue 3.4 + TypeScript + Vite 5 single-page ilova.

## Qatlamlar

| Papka | Mas'uliyat |
| --- | --- |
| `src/api` | `http.ts` (axios instance, bearer header, 401 da refresh, xatolarni normallashtirish, `cleanQuery`), `types.ts` (API modellari), har bir resurs uchun modul (`studentsApi`, `paymentsApi`, …) |
| `src/stores` | Pinia: `auth` (sessiya, ruxsat yordamchilari), `ui` (til, sidebar), `notifications` (o'qilmaganlar soni, so'nggilar, Socket.IO) |
| `src/composables` | `usePagination` (server tomonidagi paging, qidiruv debounce, filtrlar, saralash), `useForm` + `rules` (validatsiya), `useToast`, `useConfirm`, `useAsync`, `usePermissions`, `useFormatters` |
| `src/components/ui` | o'z UI kit: `AppButton`, `AppInput`, `AppSelect`, `AppSearchSelect`, `AppTextarea`, `AppCheckbox`, `AppSwitch`, `AppTable`, `AppPagination`, `AppTabs`, `AppDropdown`, `AppModal`, `AppDrawer`, `AppCard`, `AppStat`, `AppBadge`, `StatusBadge`, `AppAvatar`, `AppEmpty`, `AppLoading`, `AppErrorState`, `AppToaster`, `AppConfirmDialog`, `AppPageHeader`, `AppIcon` |
| `src/components/charts` | `LineChart`, `BarChart`, `DoughnutChart` (vue-chartjs) |
| `src/components/layout` | `DefaultLayout`, `AuthLayout`, `AppSidebar`, `AppHeader`, `AppBreadcrumbs`, `LanguageSwitcher`, `NotificationsBell`, `UserMenu` |
| `src/router` | `meta.permissions` / `meta.roles` li marshrutlar, sessiyani tiklovchi va `/login` yoki `/forbidden` ga yo'naltiruvchi guard; `menu.ts` sidebar ni boshqaradi |
| `src/i18n` | vue-i18n, `uz`, `en`, `ru` xabar fayllari (bir xil kalitlar to'plami); tanlangan til `localStorage` da saqlanadi |
| `src/views` | modul bo'yicha sahifalar; forma dialoglari ro'yxat sahifalari yonida |
| `src/styles` | har bir komponentga qo'shiladigan `_tokens.scss` (ranglar, radiuslar, soyalar, oraliqlar, breakpointlar, mixinlar); `main.scss` (reset, utilitalar) |

## Sahifalar

Login · Boshqaruv paneli · Hisobotlar · O'quvchilar (ro'yxat, tabli detal, forma) · O'qituvchilar (ro'yxat,
detal, forma, o'qituvchi paneli) · Kurslar va kategoriyalar · Guruhlar (ro'yxat, o'quvchilar / jadval /
jurnal / to'lovlar / statistika tabli detal, biriktirish dialogi) · Dars jadvali (haftalik kalendar,
to'qnashuv tekshiruvli slot dialogi) · Darslar (ro'yxat, generatsiya, qo'lda dars) · Davomat belgilash ·
Davomat statistikasi · To'lovlar · Invoyslar · Qarzdorlar · Bildirishnomalar · Foydalanuvchilar · Rollar
va ruxsatlar · Filiallar va xonalar · Audit jurnali · Profil · O'quvchi portali · 403 / 404.

## Patternlar

- **Ro'yxatlar**: `usePagination(fetcher)` + `AppTable` + `AppPagination`; paging, qidiruv, saralash va
  filtrlash serverda bajariladi.
- **Formalar**: `rules.required/email/phone/min/max/minLength/time` bilan `useForm(initial, schema)`;
  `AppFormField` label, izoh va xatolarni ko'rsatadi; server xatolari toast orqali chiqadi.
- **Holatlar**: har bir ma'lumotli sahifada `AppLoading`, `AppEmpty`, `AppErrorState` (qayta urinish bilan);
  yuklanishda jadval skeletonlari.
- **Kirish**: `usePermissions().can('students.create')` amallarni yashiradi; router guard marshrutlarni himoya qiladi.
- **Formatlash**: pul (UZS), sana, vaqt, foiz va oy nomlari uchun joriy tilda `useFormatters()`.
- **Real vaqt**: `notifications` store logindan keyin Socket.IO ga ulanadi va har bir kelgan bildirishnoma
  uchun toast ko'rsatadi; headerdagi qo'ng'iroq o'qilmaganlar sonini ko'rsatadi.

## Moslashuvchan dizayn

Avval desktop. Sidebar ikonkalargacha yig'iladi (saqlanadi) va 1024 px dan pastda off-canvas bo'ladi;
jadvallar ikkinchi darajali ustunlarni yashiradi (`hideBelow`), gridlar kichik ekranlarda bitta ustunga
tushadi.

## Skriptlar

```bash
npm run dev         # /api va /socket.io ni http://localhost:3000 ga proxylovchi Vite dev server
npm run typecheck   # vue-tsc --noEmit
npm run build       # typecheck + dist/ ga production build
npm run preview     # production buildni ko'rish
npm run lint
```

Muhit: `VITE_API_BASE_URL` (sukut `/api/v1`) va `VITE_WS_URL` (sukut `/`), qarang: `frontend/.env.example`.
