# API

Asosiy yo'l: `/api/v1`. Interaktiv hujjat: `/api/docs` (Bearer autentifikatsiyali Swagger UI),
mashina o'qiydigan: `/api/docs-json`.

## Qoidalar

- Muvaffaqiyat: `{ "success": true, "statusCode": 200, "data": ... }`
- Xato: `{ "success": false, "statusCode": 400, "message": "Validation failed", "errors": [], "path": "/api/v1/...", "timestamp": "..." }`
- Ro'yxatlar `page`, `limit` (maks 100), `search`, `sortBy`, `sortOrder` va modul filtrlarini qabul
  qiladi hamda `{ "items": [...], "meta": { "page", "limit", "total", "totalPages" } }` qaytaradi.
- Autentifikatsiya: `Authorization: Bearer <accessToken>`.
- Sanalar `YYYY-MM-DD`, vaqtlar `HH:mm`, pul — UZS da son.

## Endpointlar

### Auth
| Metod | Yo'l | Ruxsat | Tavsif |
| --- | --- | --- | --- |
| POST | /auth/login | ochiq | Email + parol → tokenlar + foydalanuvchi |
| POST | /auth/refresh | ochiq | Refresh tokenni rotatsiya qilish |
| POST | /auth/logout | auth | Refresh tokenni bekor qilish (berilmasa — hammasini) |
| GET | /auth/me | auth | Joriy foydalanuvchi, rollar va ruxsatlar |
| POST | /auth/change-password | auth | O'z parolini o'zgartirish |

### Foydalanuvchilar, rollar, ruxsatlar, audit
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /users | users.read / users.create |
| GET/PATCH/DELETE | /users/:id | users.read / users.update / users.delete |
| GET/POST | /roles | roles.read / roles.create |
| GET/PATCH/DELETE | /roles/:id | roles.read / roles.update / roles.delete |
| GET | /permissions | permissions.read |
| GET | /audit-logs | audit.read |

### O'quvchilar
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /students | students.read / students.create |
| GET | /students/lookup | students.read |
| GET | /students/me | auth (o'quvchi) |
| GET/PATCH/DELETE | /students/:id | students.read / students.update / students.delete |
| GET | /students/:id/profile | students.read |
| POST | /students/:id/parents | students.update |
| PATCH/DELETE | /students/:id/parents/:parentId | students.update |

### O'qituvchilar
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /teachers | teachers.read / teachers.create |
| GET | /teachers/lookup | groups.read |
| GET | /teachers/me | auth (o'qituvchi) |
| GET/PATCH/DELETE | /teachers/:id | teachers.read / teachers.update / teachers.delete |
| GET | /teachers/:id/profile, /teachers/:id/dashboard | teachers.read |

### Kurslar
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /courses | courses.read / courses.create |
| GET/PATCH/DELETE | /courses/:id | courses.read / courses.update / courses.delete |
| GET/POST | /courses/categories | courses.read / courses.create |
| PATCH/DELETE | /courses/categories/:id | courses.update / courses.delete |

### Guruhlar
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /groups | groups.read / groups.create |
| GET | /groups/lookup | groups.read |
| GET/PATCH/DELETE | /groups/:id | groups.read / groups.update / groups.delete |
| GET | /groups/:id/statistics, /groups/:id/students | groups.read |
| POST | /groups/:id/students | groups.enroll |
| PATCH/DELETE | /groups/:id/students/:enrollmentId | groups.enroll |

### Jadval, filiallar, xonalar
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /schedules | schedules.read / schedules.create |
| GET | /schedules/calendar?from&to&groupId&teacherId&roomId | schedules.read |
| POST | /schedules/check-conflicts | schedules.read |
| GET/PATCH/DELETE | /schedules/:id | schedules.read / schedules.update / schedules.delete |
| GET/POST | /branches, /rooms | branches.read / branches.create, rooms.read / rooms.create |
| PATCH/DELETE | /branches/:id, /rooms/:id | branches.update / branches.delete, rooms.update / rooms.delete |

### Darslar va davomat
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /lessons | lessons.read / lessons.create |
| POST | /lessons/generate | lessons.create |
| GET/PATCH | /lessons/:id | lessons.read / lessons.update |
| GET | /lessons/:id/attendance | attendance.read |
| PUT | /lessons/:id/attendance | attendance.mark |
| GET | /attendance/groups/:groupId/journal, /attendance/groups/:groupId/stats | attendance.read |
| GET | /attendance/students/:studentId/stats, /attendance/students/:studentId/history | auth (cheklangan) |
| GET | /attendance/teachers/:teacherId/stats | attendance.read |
| GET | /attendance/monthly?year&month&groupId&teacherId | attendance.read |

### To'lovlar va invoyslar
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET/POST | /payments | payments.read / payments.create |
| GET | /payments/debtors | payments.read |
| GET | /payments/students/:studentId/summary, /payments/students/:studentId/history | auth (cheklangan) |
| GET | /payments/groups/:groupId/summary | payments.read |
| GET | /payments/:id | payments.read |
| POST | /payments/:id/refund, /payments/:id/cancel | payments.update |
| GET/POST | /invoices | invoices.read / invoices.create |
| POST | /invoices/generate | invoices.create |
| GET/PATCH | /invoices/:id | invoices.read / invoices.update |
| POST | /invoices/:id/cancel | invoices.update |

### Bildirishnomalar, hisobotlar, fayllar, health
| Metod | Yo'l | Ruxsat |
| --- | --- | --- |
| GET | /notifications, /notifications/unread-count | auth |
| PATCH | /notifications/:id/read | auth |
| POST | /notifications/read-all | auth |
| DELETE | /notifications/:id | auth |
| POST | /notifications/send | notifications.send |
| GET | /reports/dashboard, /reports/revenue, /reports/attendance, /reports/students, /reports/recent-activity | reports.read |
| POST | /files?category= (multipart `file`) | files.upload |
| GET | /files/:id | ochiq |
| DELETE | /files/:id | files.upload |
| GET | /health | ochiq |

## WebSocket

Gateway originida Socket.IO. `auth: { token: <accessToken> }` bilan ulaning; soket `user:<id>` va
`role:<nom>` xonalariga qo'shiladi va bildirishnoma yozuvi bilan `notification` hodisalarini oladi.

## Misol

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@crm.local","password":"Password123!"}' | jq -r .data.accessToken)

curl -s "localhost:3000/api/v1/students?page=1&limit=10&status=ACTIVE" \
  -H "authorization: Bearer $TOKEN" | jq .data.meta
```
