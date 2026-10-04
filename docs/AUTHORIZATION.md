# Avtorizatsiya

## Model

Rollar va ruxsatlar — kod emas, baza yozuvlari. Foydalanuvchida ko'p rol, rolda ko'p ruxsat bo'ladi.
Ruxsat katalogi (`backend/libs/common/src/constants/permissions.ts`) `rolesSeed` orqali seed qilinadi
va yangilanib turadi; administratorlar `POST /roles` orqali maxsus rollar yaratib, istalgan ruxsat
to'plamini biriktirishi mumkin.

Ruxsat kodlari `modul.amal` ko'rinishida:

```text
users.read|create|update|delete      roles.read|create|update|delete      permissions.read
students.*  teachers.*  courses.*  groups.* + groups.enroll
schedules.*  rooms.*  branches.*    lessons.read|create|update
attendance.read|mark   payments.read|create|update   invoices.read|create|update
notifications.read|send   reports.read   audit.read   files.upload
```

## Standart rollar

![Rollar va ruxsatlar sahifasi](screenshots/22-roles.png)

| Rol | Doira |
| --- | --- |
| SUPER_ADMIN | barcha ruxsatlar; guardda ruxsat tekshiruvini chetlab o'tadi |
| ADMIN | rollarni yaratish, o'zgartirish va o'chirishdan tashqari hammasi |
| MANAGER | o'quvchilar, o'qituvchilar, kurslar, guruhlar, jadval, xonalar, filiallar, darslar, davomat (o'qish), moliya (o'qish), bildirishnomalar, hisobotlar |
| TEACHER | o'quvchilar/guruhlar/kurslar/jadvalni o'qish, dars yaratish/o'zgartirish, davomat belgilash |
| CASHIER | to'lovlar va invoyslar, o'quvchilar/guruhlar/kurslarni o'qish, hisobotlar |
| STUDENT | o'z guruhlari, jadvali, darslari, davomati, to'lovlari, invoyslari, bildirishnomalarini o'qish |

Tizim rollarini qayta nomlash yoki o'chirish mumkin emas; `SUPER_ADMIN` ruxsatlari o'zgartirilmaydi.
`SUPER_ADMIN` rolini faqat super admin biriktira oladi, SUPER_ADMIN hisobini faqat boshqa super admin
tahrirlashi yoki o'chirishi mumkin. Administrator tomonidan parol almashtirilganda foydalanuvchining
barcha sessiyalari (refresh tokenlari) bekor qilinadi.

## Amalga oshirilishi

O'qituvchi faqat o'z guruhlarini, o'quvchi faqat o'z ma'lumotlarini ko'radi:

| O'qituvchi paneli | O'quvchi portali |
| --- | --- |
| ![O'qituvchi paneli](screenshots/27-teacher-dashboard.png) | ![O'quvchi portali](screenshots/28-student-portal.png) |

1. **Gateway** — controller metodlaridagi `@RequirePermissions('students.read')` ni `PermissionsGuard`
   access tokendagi ruxsatlar bilan tekshiradi. `@RequireRoles(...)` ham mavjud. Ruxsat yo'q → standart
   xato konvertida 403.
2. **Servislar** — har bir handler `RequestMeta` oladi va **ma'lumotlarni cheklaydi**:
   - o'qituvchilar (xodim roli bo'lmagan `TEACHER`) faqat o'zi dars beradigan guruhlarni, ulardagi
     o'quvchilarni, darslarni, to'lovlarni ko'radi va faqat shu yerda davomat belgilaydi;
   - o'quvchilar faqat o'z profili, biriktirishlari, davomati, invoyslari, to'lovlari va
     bildirishnomalarini ko'radi;
   - xodim rollari (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `CASHIER`) cheklanmaydi.
   Yordamchilar: `libs/common/src/utils/access.util.ts` dagi `isStaff`, `isTeacherScoped`, `isStudentScoped`.
3. **Frontend** — router guard `meta.permissions`/`meta.roles` ni tekshiradi, sidebar ruxsat yo'q
   bo'limlarni yashiradi, `usePermissions().can(...)` tugmalarni yashiradi; haqiqat manbai API bo'lib qoladi.

## Ruxsatlarni o'zgartirish

Rol tahrirlanganidan keyin foydalanuvchilar yangi ruxsat to'plamini access token yangilanganda (ko'pi
bilan 15 daqiqada) yoki qayta kirganda oladi.
