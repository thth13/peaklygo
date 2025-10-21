# API Групповых целей

## Обзор

Групповые цели позволяют нескольким пользователям работать над одной целью вместе. У каждой групповой цели есть владелец, администраторы и участники.

## Роли участников

- **Owner** - владелец, создатель цели (не может быть удален)
- **Admin** - администратор (может добавлять/удалять участников)
- **Member** - обычный участник

## Статусы приглашений

- **Pending** - приглашение отправлено, ожидает ответа
- **Accepted** - приглашение принято
- **Declined** - приглашение отклонено

## Эндпоинты

### 1. Создание групповой цели

```
POST /goals/group
```

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**

```json
{
  "goalName": "Запустить стартап",
  "category": "Бизнес",
  "description": "Создать успешный продукт",
  "goalType": "regular",
  "userId": "507f1f77bcf86cd799439011",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "privacy": "friends",
  "value": "300",
  "participantIds": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "groupSettings": {
    "allowMembersToInvite": false,
    "requireApproval": true,
    "maxParticipants": 10
  },
  "steps": [],
  "image": <file>
}
```

**Response:** Goal object с полем `isGroup: true` и массивом `participants`

---

### 2. Получить мои групповые цели

```
GET /goals/group/my?page=1&limit=10&filter=active
```

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` - номер страницы (по умолчанию 1)
- `limit` - количество на странице (по умолчанию 10, макс 100)
- `filter` - фильтр: `active`, `completed`, `archived`

**Response:**

```json
{
  "goals": [...],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

---

### 3. Получить приглашения в группы

```
GET /goals/group/invitations
```

**Headers:**

```
Authorization: Bearer <token>
```

**Response:** Массив целей, где пользователь имеет статус приглашения `pending`

---

### 4. Добавить участника в группу

```
POST /goals/:goalId/participants
```

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "userId": "507f1f77bcf86cd799439014",
  "role": "member"
}
```

**Permissions:**

- Owner и Admin могут добавлять всегда
- Member может добавлять только если `groupSettings.allowMembersToInvite = true`

**Response:** Обновленный Goal object

---

### 4.1 Поиск пользователей для приглашения

```
GET /goals/group/users/search?query=ann&limit=10&goalId=<goalId>&excludeUserIds=id1,id2
```

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `query` (обязательный) — строка поиска по username, имени профиля или email
- `limit` (необязательный) — количество результатов (по умолчанию 10, максимум 50)
- `goalId` (необязательный) — идентификатор групповой цели; участники этой цели не будут возвращены
- `excludeUserIds` (необязательный) — список идентификаторов через запятую, которые нужно исключить из выдачи (например, уже выбранные пользователи)

**Response:**

```json
[
  {
    "userId": "507f1f77bcf86cd799439012",
    "username": "ann_smith",
    "name": "Ann Smith",
    "avatar": "avatar-key.jpeg"
  }
]
```

---

### 5. Ответить на приглашение

```
PUT /goals/:goalId/invitations/respond
```

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "status": "accepted"
}
```

Возможные значения `status`: `accepted`, `declined`

**Response:** Обновленный Goal object

---

### 6. Удалить участника

```
DELETE /goals/:goalId/participants/:participantId
```

**Headers:**

```
Authorization: Bearer <token>
```

**Permissions:**

- Owner и Admin могут удалять любых участников (кроме Owner)
- Member может удалить только себя

**Response:** Обновленный Goal object

---

### 7. Получить статистику групповой цели

```
GET /goals/:goalId/group/stats
```

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "totalParticipants": 5,
  "activeParticipants": 4,
  "pendingInvitations": 1,
  "topContributors": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "contributionScore": 150
    },
    {
      "userId": "507f1f77bcf86cd799439012",
      "contributionScore": 120
    }
  ]
}
```

---

## Особенности работы

### Вклад участников (Contribution Score)

- При выполнении шага в групповой цели участник получает очки вклада
- Очки вклада = `Math.floor(goal.value / 10)` за каждый выполненный шаг
- Рейтинг пользователя также увеличивается на эту величину

### Статистики пользователя

- При создании групповой цели только создатель получает +1 к активным целям
- При принятии приглашения участник получает +1 к активным целям
- При удалении/выходе из группы участник получает -1 к активным целям
- Выполнение шагов увеличивает счетчик закрытых задач и рейтинг

### Настройки группы (groupSettings)

- `allowMembersToInvite` - могут ли обычные участники приглашать других
- `requireApproval` - требуется ли подтверждение приглашений
- `maxParticipants` - максимальное количество участников (по умолчанию 10)

### Отличия от обычных целей

1. `isGroup: true`
2. Массив `participants` с информацией об участниках
3. Объект `groupSettings` с настройками группы
4. При получении обычных целей через `/goals/userGoals/:userId` групповые цели не отображаются
5. Для групповых целей есть отдельный эндпоинт `/goals/group/my`

## Пример полного flow

### 1. Пользователь A создает групповую цель и приглашает B и C

```
POST /goals/group
participantIds: [B_id, C_id]
```

Результат:

- A - owner, статус accepted
- B - member, статус pending
- C - member, статус pending

### 2. Пользователь B принимает приглашение

```
PUT /goals/:goalId/invitations/respond
{ status: "accepted" }
```

Результат:

- B получает +1 к активным целям

### 3. Пользователь C отклоняет приглашение

```
PUT /goals/:goalId/invitations/respond
{ status: "declined" }
```

Результат:

- C не получает изменений в статистике

### 4. Пользователь A добавляет нового участника D

```
POST /goals/:goalId/participants
{ userId: D_id, role: "member" }
```

### 5. Пользователь B выполняет шаг

```
PUT /goals/:goalId/steps/:stepId/complete
{ isCompleted: true }
```

Результат:

- B получает +contributionScore
- B получает +rating
- B получает +closedTasks

### 6. Просмотр статистики группы

```
GET /goals/:goalId/group/stats
```

Показывает топ-5 участников по вкладу
