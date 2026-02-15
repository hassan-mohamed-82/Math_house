# Questions API Documentation

Base URL: `/admin/questions`

> [!NOTE]
> All endpoints require authentication and `admin` or `teacher` role authorization.

---

## Question Endpoints

### 1. Create Question

**`POST /admin/questions`**

Creates a new question.

**Request Body:**

| Field          | Type   | Required | Description                          |
| -------------- | ------ | -------- | ------------------------------------ |
| `question`     | string | ✅        | The question text                    |
| `image`        | string | ❌        | Base64 encoded image or URL          |
| `answerType`   | enum   | ✅        | `MCQ` or `Grid in`                   |
| `difficulty`   | enum   | ✅        | `A`, `B`, `C`, `D`, `E`              |
| `questionType` | enum   | ✅        | `Trail` or `Extra`                   |
| `lessonId`     | string | ✅        | Lesson UUID                          |
| `year`         | number | ✅        | Year                                 |
| `month`        | enum   | ✅        | `Jan`, `Feb`, `Mar`, ...             |
| `section`      | enum   | ✅        | `1`, `2`, `3`, `4`                   |
| `codeId`       | string | ✅        | Exam Code UUID                       |
| `options`      | array  | ⚠️        | Required if `answerType` is `MCQ`    |
| `answerPdf`    | string | ❌        | PDF URL for the answer explanation   |
| `answerVideo`  | string | ❌        | Video URL for the answer explanation |

**Options Array Item:**
```json
{
  "answer": "Option text",
  "isCorrect": true,
  "order": "A"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "message": "Question created successfully"
  }
}
```

**Error Responses:**

| Status | Condition                     |
| ------ | ----------------------------- |
| 400    | Missing required fields       |
| 400    | Options missing for MCQ       |
| 404    | Lesson or Exam code not found |

---

### 2. Get All Questions

**`GET /admin/questions`**

Returns a paginated list of all questions.

**Query Parameters:**

| Param   | Type   | Description                            |
| ------- | ------ | -------------------------------------- |
| `page`  | number | Page number (default: 1)               |
| `limit` | number | Number of items per page (default: 10) |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "question": "...",
      "answerType": "MCQ",
      "difficulty": "A",
      "questionType": "Trail",
      "lesson": { "id": "uuid", "name": "..." },
      "examCode": { "id": "uuid", "code": "..." },
       ...
    }
  ],
  "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
  }
}
```

---

### 3. Get Question by ID

**`GET /admin/questions/:id`**

Returns a single question with details.

**URL Parameters:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | Question UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
      "question": "...",
      "id": "...",
      ...
  }
}
```

**Error:** `404` if question not found.

---

### 4. Update Question

**`PUT /admin/questions/:id`**

Updates an existing question.

**URL Parameters:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | Question UUID |

**Request Body:** Same fields as Create Question (all optional).

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Question updated successfully" }
}
```

---

### 5. Delete Question

**`DELETE /admin/questions/:id`**

Deletes a question and its associated options, answers, and parallel questions.

**URL Parameters:**

| Param | Type   | Description   |
| ----- | ------ | ------------- |
| `id`  | string | Question UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Question deleted successfully" }
}
```

---

## Parallel Question Endpoints

### 6. Generate Parallel Question (AI)

**`POST /admin/questions/parallel/generate`**

Triggers an AI job to generate a parallel question based on an original question.

**Request Body:**

| Field                | Type   | Required | Description            |
| -------------------- | ------ | -------- | ---------------------- |
| `origianlQuestionId` | string | ✅        | Original Question UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Parallel question generation started",
    "jobId": "..."
  }
}
```

---

### 7. Create Parallel Question (Manual)

**`POST /admin/questions/parallel`**

Manually creates a parallel question.

**Request Body:**

| Field                | Type   | Required | Description                       |
| -------------------- | ------ | -------- | --------------------------------- |
| `origianlQuestionId` | string | ✅        | Original Question UUID            |
| `question`           | string | ✅        | Question text                     |
| `answerType`         | enum   | ✅        | `MCQ` or `Grid in`                |
| `difficulty`         | enum   | ✅        | `A`, `B`, `C`, `D`, `E`           |
| `lessonId`           | string | ✅        | Lesson UUID                       |
| `options`            | array  | ⚠️        | Required if `answerType` is `MCQ` |

**Success Response (201):**

```json
{
  "success": true,
  "data": { "message": "Parallel question created successfully" }
}
```

---

### 8. Get All Parallel Questions

**`GET /admin/questions/parallel`**

Returns a paginated list of all parallel questions.

**Query Parameters:**

| Param   | Type   | Description                            |
| ------- | ------ | -------------------------------------- |
| `page`  | number | Page number (default: 1)               |
| `limit` | number | Number of items per page (default: 10) |

**Success Response (200):**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
  }
}
```

---

### 9. Get Parallel Question by ID

**`GET /admin/questions/parallel/:id`**

Returns a single parallel question.

**Success Response (200):**

```json
{
  "success": true,
  "data": { ... }
}
```

---

### 10. Update Parallel Question

**`PUT /admin/questions/parallel/:id`**

Updates a parallel question.

**Request Body:** Similar to Create Parallel Question.

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Parallel question updated successfully" }
}
```

---

### 11. Delete Parallel Question

**`DELETE /admin/questions/parallel/:id`**

Deletes a parallel question.

**Success Response (200):**

```json
{
  "success": true,
  "data": { "message": "Parallel Question deleted successfully" }
}
```

---

## OCR

### 12. Extract Text from Image

**`POST /admin/questions/ocr`**

Extracts text from an uploaded image.

**Request Body:**
- `image`: File (multipart/form-data)

**Success Response (200):**

```json
{
  "success": true,
  "data": "Extracted text..."
}
```
