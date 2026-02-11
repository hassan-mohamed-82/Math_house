# Lessons API Documentation

Base URL: `/admin/lessons`

> [!NOTE]
> All endpoints require authentication and `admin` or `teacher` role authorization.

---

## Lesson Endpoints

### 1. Create Lesson

**`POST /admin/lessons`**

Creates a new lesson. `categoryId` and `courseId` are auto-derived from the chapter. `order` is auto-computed as `MAX(order) + 1` within the chapter.

**Request Body:**

| Field            | Type   | Required | Description                                     |
| ---------------- | ------ | -------- | ----------------------------------------------- |
| `name`           | string | ✅        | Lesson name (must be unique within the chapter) |
| `chapterId`      | string | ✅        | Chapter UUID                                    |
| `teacherId`      | string | ✅        | Teacher UUID                                    |
| `price`          | number | ✅        | Lesson price                                    |
| `discount`       | number | ❌        | Discount amount (defaults to 0)                 |
| `description`    | string | ❌        | Lesson description                              |
| `image`          | string | ❌        | Base64 encoded image                            |
| `preRequisition` | string | ❌        | Pre-requisition text                            |
| `whatYouGain`    | string | ❌        | What you'll gain text                           |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Lesson created successfully",
    "order": 1
  }
}
```

**Error Responses:**

| Status | Condition                        |
| ------ | -------------------------------- |
| 400    | Missing required fields          |
| 400    | Duplicate lesson name in chapter |
| 404    | Chapter or Teacher not found     |

---

### 2. Get All Lessons

**`GET /admin/lessons`**

Returns all lessons **grouped by chapter**. Each chapter contains its lessons (ordered by `order`), and each lesson contains its ideas (ordered by `ideaOrder`).

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Lessons fetched successfully",
    "chapters": [
      {
        "chapter": {
          "id": "uuid",
          "name": "Numbers & Operations",
          "description": "...",
          "image": "..."
        },
        "lessons": [
          {
            "id": "uuid",
            "name": "Introduction to Numbers",
            "description": "...",
            "image": "http://...",
            "price": 20,
            "discount": 0,
            "totalPrice": 20,
            "order": 1,
            "course": { "id": "uuid", "name": "Algebra Basics", "..." },
            "category": { "id": "uuid", "name": "Primary 1", "..." },
            "teacher": { "id": "uuid", "name": "Ahmed Hassan", "..." },
            "ideas": [
              { "id": "uuid", "idea": "Natural Numbers", "ideaOrder": 1, "pdf": null, "video": null },
              { "id": "uuid", "idea": "Whole Numbers", "ideaOrder": 2, "pdf": null, "video": null }
            ]
          },
          {
            "id": "uuid",
            "name": "Addition & Subtraction",
            "order": 2,
            "ideas": [ "..." ]
          }
        ]
      }
    ]
  }
}
```

---

### 3. Get Lessons by Chapter ID

**`GET /admin/lessons/chapter/:chapterId`**

Returns all lessons for a specific chapter, ordered by `order`. Each lesson includes its ideas (ordered by `ideaOrder`).

**URL Parameters:**

| Param       | Type   | Description  |
| ----------- | ------ | ------------ |
| `chapterId` | string | Chapter UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Lessons fetched successfully",
    "lessons": [
      {
        "lesson": { "id": "uuid", "name": "...", "order": 1, "..." },
        "chapter": { "..." },
        "course": { "..." },
        "category": { "..." },
        "teacher": { "..." },
        "ideas": [
          { "id": "uuid", "idea": "...", "ideaOrder": 1, "..." }
        ]
      }
    ]
  }
}
```

---

### 4. Get Lesson by ID

**`GET /admin/lessons/:id`**

Returns a single lesson with full details.

**URL Parameters:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | Lesson UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Lesson fetched successfully",
    "lesson": { "id": "uuid", "name": "...", "order": 1, "..." },
    "chapter": { "..." },
    "course": { "..." },
    "category": { "..." },
    "teacher": { "..." },
    "ideas": [
      { "id": "uuid", "idea": "Natural Numbers", "ideaOrder": 1, "pdf": null, "video": null },
      { "id": "uuid", "idea": "Whole Numbers", "ideaOrder": 2, "pdf": null, "video": null }
    ]
  }
}
```

**Error:** `404` if lesson not found.

---

### 5. Update Lesson

**`PUT /admin/lessons/:id`**

Updates an existing lesson. If `chapterId` changes, `courseId` and `categoryId` are re-derived.

**URL Parameters:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | Lesson UUID |

**Request Body:** Same fields as Create Lesson (all optional).

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Lesson updated successfully" }
}
```

**Error Responses:**

| Status | Condition                             |
| ------ | ------------------------------------- |
| 400    | Duplicate lesson name in chapter      |
| 404    | Lesson, Chapter, or Teacher not found |

---

### 6. Delete Lesson

**`DELETE /admin/lessons/:id`**

Deletes a lesson and re-sequences the order of remaining lessons in the same chapter.

**URL Parameters:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | Lesson UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Lesson deleted successfully" }
}
```

> [!IMPORTANT]
> Deleting a lesson automatically re-sequences the order of all remaining lessons in the same chapter. Example: deleting order `2` from `[1, 2, 3]` results in `[1, 2]`.

**Error:** `404` if lesson not found.

---

### 7. Swap Lesson Order

**`PATCH /admin/lessons/swap-order`**

Swaps the order of two lessons. Both must belong to the same chapter.

**Request Body:**

| Field       | Type   | Required | Description        |
| ----------- | ------ | -------- | ------------------ |
| `lessonIdA` | string | ✅        | First lesson UUID  |
| `lessonIdB` | string | ✅        | Second lesson UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Lesson order swapped successfully" }
}
```

**Error Responses:**

| Status | Condition                                      |
| ------ | ---------------------------------------------- |
| 400    | Missing IDs or lessons from different chapters |
| 404    | One or both lessons not found                  |

---

## Lesson Idea Endpoints

### 8. Create Lesson Idea

**`POST /admin/lessons/ideas`**

Creates a new idea for a lesson. `ideaOrder` is auto-computed as `MAX(ideaOrder) + 1` within the lesson.

**Request Body:**

| Field      | Type   | Required | Description  |
| ---------- | ------ | -------- | ------------ |
| `lessonId` | string | ✅        | Lesson UUID  |
| `idea`     | string | ✅        | Idea content |
| `pdf`      | string | ❌        | PDF URL      |
| `video`    | string | ❌        | Video URL    |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Lesson idea created successfully",
    "ideaOrder": 1
  }
}
```

**Error Responses:**

| Status | Condition               |
| ------ | ----------------------- |
| 400    | Missing required fields |
| 404    | Lesson not found        |

---

### 9. Get Ideas by Lesson ID

**`GET /admin/lessons/ideas/lesson/:lessonId`**

Returns all ideas for a lesson, ordered by `ideaOrder`.

**URL Parameters:**

| Param      | Type   | Description |
| ---------- | ------ | ----------- |
| `lessonId` | string | Lesson UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Lesson ideas fetched successfully",
    "ideas": [
      {
        "id": "uuid",
        "idea": "Idea content",
        "lessonId": "uuid",
        "ideaOrder": 1,
        "pdf": "http://...",
        "video": "http://...",
        "createdAt": "2026-02-11T...",
        "updatedAt": "2026-02-11T..."
      }
    ]
  }
}
```

---

### 10. Update Lesson Idea

**`PUT /admin/lessons/ideas/:id`**

Updates an existing lesson idea.

**URL Parameters:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | Idea UUID   |

**Request Body:**

| Field   | Type   | Required | Description  |
| ------- | ------ | -------- | ------------ |
| `idea`  | string | ❌        | Idea content |
| `pdf`   | string | ❌        | PDF URL      |
| `video` | string | ❌        | Video URL    |

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Lesson idea updated successfully" }
}
```

**Error:** `404` if idea not found.

---

### 11. Delete Lesson Idea

**`DELETE /admin/lessons/ideas/:id`**

Deletes a lesson idea and re-sequences the order of remaining ideas in the same lesson.

**URL Parameters:**

| Param | Type   | Description |
| ----- | ------ | ----------- |
| `id`  | string | Idea UUID   |

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Lesson idea deleted successfully" }
}
```

> [!IMPORTANT]
> Deleting an idea automatically re-sequences the `ideaOrder` of all remaining ideas in the same lesson.

**Error:** `404` if idea not found.

---

### 12. Swap Idea Order

**`PATCH /admin/lessons/ideas/swap-order`**

Swaps the order of two ideas. Both must belong to the same lesson.

**Request Body:**

| Field     | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `ideaIdA` | string | ✅        | First idea UUID  |
| `ideaIdB` | string | ✅        | Second idea UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Idea order swapped successfully" }
}
```

**Error Responses:**

| Status | Condition                                   |
| ------ | ------------------------------------------- |
| 400    | Missing IDs or ideas from different lessons |
| 404    | One or both ideas not found                 |
