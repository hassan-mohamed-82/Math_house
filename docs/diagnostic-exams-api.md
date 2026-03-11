# User Diagnostic Exams API Documentation

Base URL: `/user/diagnostic-exams`

---

## Endpoints

### 1. Get All Diagnostic Exams

**`GET /user/diagnostic-exams`**

Retrieves a list of all diagnostic exams along with their associated course details.

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Exam Title",
      "description": "Exam Description",
      "duration": 60,
      "totalScore": 100,
      "passScore": 50,
      "rawScoreId": "uuid",
      "numberOfQuestions": 20,
      "isActive": true,
      "courseId": "uuid",
      "course": {
        "Id": "uuid",
        "name": "Course Name",
        "description": "Course Description"
      }
    }
  ]
}
```

---

### 2. Get Diagnostic Exam by ID

**`GET /user/diagnostic-exams/:id`**

Retrieves the details of a specific diagnostic exam.

**URL Parameters:**

| Param | Type   | Description          |
| ----- | ------ | -------------------- |
| `id`  | string | Diagnostic Exam UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Exam Title",
      "description": "Exam Description",
      "duration": 60,
      "totalScore": 100,
      "passScore": 50,
      "rawScoreId": "uuid",
      "numberOfQuestions": 20,
      "isActive": true,
      "courseId": "uuid",
      "course": {
        "Id": "uuid",
        "name": "Course Name",
        "description": "Course Description"
      }
    }
  ]
}
```

---

### 3. Get Diagnostic Exam Questions (Options)

**`GET /user/diagnostic-exams/:id/questions`**

Retrieves a paginated list of all questions with their options belonging to a specific diagnostic exam. This endpoint does **not** expose the correct answers.

**URL Parameters:**

| Param | Type   | Description          |
| ----- | ------ | -------------------- |
| `id`  | string | Diagnostic Exam UUID |

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
      "id": "uuid",
      "question": "Question text",
      "image": "url-or-null",
      "answerType": "MCQ",
      "difficulty": "A",
      "questionType": "Trail",
      "year": 2024,
      "month": "Jan",
      "score": 5,
      "options": [
        {
          "answer": "Option 1",
          "order": "A"
        },
        {
          "answer": "Option 2",
          "order": "B"
        }
      ]
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```
