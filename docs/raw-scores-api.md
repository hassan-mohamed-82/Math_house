# Raw Scores API Documentation

Base URL: `/admin/rawScore`

> [!NOTE]
> All endpoints require authentication and `admin` or `teacher` role authorization.

---

## Raw Score Endpoints

### 1. Create Raw Score

**`POST /admin/rawScore`**

Creates a new Raw Score rule.

**Request Body:**

| Field             | Type    | Required | Description                                   |
| ----------------- | ------- | -------- | --------------------------------------------- |
| `name`            | string  | ✅        | Unique name for the score rule                |
| `courseId`        | string  | ✅        | Course UUID                                   |
| `score`           | number  | ✅        | Total raw score points (e.g. 100)             |
| `is_giftingScore` | boolean | ✅        | Whether this score includes bonus/gift points |
| `giftingScore`    | number  | ✅        | Amount of bonus/gift points                   |

**Example Request:**
```json
{
  "name": "Algebra Standard Scoring",
  "courseId": "uuid-of-course",
  "score": 100,
  "is_giftingScore": false,
  "giftingScore": 0
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Raw Score created successfully"
  }
}
```

---

### 2. Get All Raw Scores

**`GET /admin/rawScore`**

Returns a list of all raw score rules with their associated course details.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Raw Score fetched successfully",
    "rawScores": [
      {
        "id": "uuid",
        "name": "Algebra Standard Scoring",
        "score": 100,
        "is_giftingScore": false,
        "giftingScore": 0,
        "courses": {
            "id": "uuid",
            "name": "Algebra I"
        }
      },
      ...
    ]
  }
}
```

---

### 3. Update Raw Score

**`PUT /admin/rawScore/:id`**

Updates an existing raw score rule.

**URL Parameters:**

| Param | Type   | Description    |
| ----- | ------ | -------------- |
| `id`  | string | Raw Score UUID |

**Request Body:**

All fields from Create are optional.

| Field             | Type    | Description                                   |
| ----------------- | ------- | --------------------------------------------- |
| `name`            | string  | Unique name for the score rule                |
| `courseId`        | string  | Course UUID                                   |
| `score`           | number  | Total raw score points                        |
| `is_giftingScore` | boolean | Whether this score includes bonus/gift points |
| `giftingScore`    | number  | Amount of bonus/gift points                   |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Raw Score updated successfully"
  }
}
```

---

### 4. Delete Raw Score

**`DELETE /admin/rawScore/:id`**

Deletes a raw score rule. 
**Note:** Cannot identify items used in active Diagnostic Exams.

**URL Parameters:**

| Param | Type   | Description    |
| ----- | ------ | -------------- |
| `id`  | string | Raw Score UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Raw Score deleted successfully"
  }
}
```
