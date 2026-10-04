# Frontend

`frontend/` dagi Vue 3.4 + TypeScript + Vite 5 single-page ilova.

## Skrinshotlar

### Kirish va boshqaruv paneli
![Kirish sahifasi](screenshots/01-login.png)
![Boshqaruv paneli](screenshots/02-dashboard.png)
![Boshqaruv paneli (rus tilida)](screenshots/26-dashboard-ru.png)

### O'quvchilar va o'qituvchilar
![O'quvchilar ro'yxati](screenshots/03-students.png)
![O'quvchi profili](screenshots/04-student-detail.png)
![O'qituvchilar](screenshots/05-teachers.png)
![O'qituvchi paneli](screenshots/27-teacher-dashboard.png)

### Kurslar va guruhlar
![Kurslar va kategoriyalar](screenshots/06-courses.png)
![Guruhlar](screenshots/07-groups.png)
![Guruh sahifasi](screenshots/08-group-detail.png)
![Guruh davomat jurnali](screenshots/09-group-journal.png)
![Guruh statistikasi](screenshots/10-group-statistics.png)

### Dars jadvali, darslar va davomat
![Dars jadvali](screenshots/11-schedule.png)
![Darslar](screenshots/12-lessons.png)
![Davomat belgilash](screenshots/13-attendance-mark.png)
![Davomat statistikasi](screenshots/14-attendance-stats.png)

### Moliya
![To'lovlar](screenshots/15-payments.png)
![To'lov qabul qilish](screenshots/16-payment-form.png)
![Invoyslar](screenshots/17-invoices.png)
![Qarzdorlar](screenshots/18-debtors.png)
![Hisobotlar](screenshots/19-reports.png)

### Bildirishnomalar va sozlamalar
![Bildirishnomalar](screenshots/20-notifications.png)
![Foydalanuvchilar](screenshots/21-users.png)
![Rollar va ruxsatlar](screenshots/22-roles.png)
![Filiallar va xonalar](screenshots/23-branches-rooms.png)
![Audit jurnali](screenshots/24-audit-log.png)
![Profil](screenshots/25-profile.png)

### O'quvchi portali
![O'quvchi portali](screenshots/28-student-portal.png)

### Mobil ko'rinish
| Ro'yxat | Menyu |
| --- | --- |
| ![Mobil ro'yxat](screenshots/29-mobile-students.png) | ![Mobil menyu](screenshots/30-mobile-menu.png) |

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
