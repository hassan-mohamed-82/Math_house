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

### 3. Get Diagnostic Exam Questions

**`GET /user/diagnostic-exams/:id/questions`**

Retrieves **all** questions with their answer options belonging to a specific diagnostic exam in a single response. This endpoint does **not** expose the correct answers (`isCorrect` is excluded from options).

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
      "question": "What is 2 + 2?",
      "image": "url-or-null",
      "answerType": "MCQ",
      "difficulty": "A",
      "questionType": "Trail",
      "year": 2024,
      "month": "Jan",
      "score": 5,
      "options": [
        { "id": "option-uuid-1", "answer": "3", "order": "A" },
        { "id": "option-uuid-2", "answer": "4", "order": "B" },
        { "id": "option-uuid-3", "answer": "5", "order": "C" }
      ]
    }
  ]
}
```

---

### 4. Start Diagnostic Exam

**`POST /user/diagnostic-exams/:examId/start`**

Creates a new exam attempt for the authenticated student. The `endedAt` timestamp is automatically calculated as `startedAt + exam.duration` (in minutes). Must be called before submitting answers.

> **Authentication required.** The `studentId` is extracted from the authenticated user's token.

**URL Parameters:**

| Param    | Type   | Description          |
| -------- | ------ | -------------------- |
| `examId` | string | Diagnostic Exam UUID |

**Request Body:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Exam started",
  "endTime": "2026-03-12T18:00:00.000Z"
}
```

**Error Responses:**

| Status | Reason                     |
| ------ | -------------------------- |
| 400    | Not authenticated          |
| 400    | Diagnostic exam not found  |

---

### 6. Get All Student Attempts

**`GET /user/diagnostic-exams/attempts`**

Retrieves all diagnostic exam attempts for the authenticated student, ordered by start time.

> **Authentication required.** The `studentId` is extracted from the authenticated user's token.

**Request Body:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Attempts retrieved successfully",
  "data": [
    {
      "id": "attempt-uuid",
      "diagnosticExamId": "exam-uuid",
      "isCompleted": false,
      "startedAt": "2026-03-12T16:00:00.000Z",
      "endedAt": "2026-03-12T17:00:00.000Z",
      "diagnosticExam": {
        "id": "exam-uuid",
        "title": "Algebra Diagnostic",
        "description": "A test to gauge your algebra skills."
      }
    }
  ]
}
```

**Error Responses:**

| Status | Reason            |
| ------ | ----------------- |
| 400    | Not authenticated |

---

### 7. Submit Diagnostic Exam

**`POST /user/diagnostic-exams/:attemptId/submit`**

Submits the authenticated student's answers for a started diagnostic exam attempt. The system will:

1. Verify the attempt exists and has not been submitted already (`isCompleted` check).
2. Check each answer against the correct options in the database.
3. Calculate the final score internally using the Raw Score grading rules.
4. Save each individual answer to the database for later review.
5. Mark the attempt as `isCompleted = true`.

> **Authentication required.** The `studentId` is extracted from the authenticated user's token.

> **Note:** The score is **not** returned in the response. The student can review their mistakes via the Review endpoint.

**URL Parameters:**

| Param       | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `attemptId` | string | Diagnostic Exam Attempt UUID |

**Request Body:**

For **MCQ** questions, send the selected option's `id` in `answerId`.  
For **Grid In** questions, send the typed text in `textValue`.  
Unanswered questions can be omitted from the array entirely.

```json
{
  "answers": [
    {
      "questionId": "question-uuid-1",
      "answerId": "selected-option-uuid"
    },
    {
      "questionId": "question-uuid-2",
      "textValue": "42"
    }
  ]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Diagnostic Exam Submitted successfully."
}
```

**Error Responses:**

| Status | Reason                                                           |
| ------ | ---------------------------------------------------------------- |
| 400    | Not authenticated                                                |
| 400    | Answers array is required                                        |
| 400    | No active exam attempt found                                     |
| 400    | This exam attempt has already been submitted                     |
| 400    | Diagnostic exam not found                                        |
| 400    | Exam time limit exceeded. Attempt has been automatically closed. |

---

### 6. Get Attempt Review (Wrong Answers & Explanations)

**`GET /user/diagnostic-exams/attempts/:attemptId/review`**

Retrieves the list of **incorrect** answers the student submitted for a specific attempt. For each wrong answer, the response includes:

- The original question text and image.
- What the student submitted (MCQ option ID or Grid In text).
- The correct answer(s).
- Explanation content (PDF and/or video), if available.

**URL Parameters:**

| Param       | Type   | Description                       |
| ----------- | ------ | --------------------------------- |
| `attemptId` | string | The UUID of the exam attempt      |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Diagnostic Exam Review retrieved successfully",
  "data": [
    {
      "questionId": "question-uuid",
      "questionText": "What is 2 + 2?",
      "questionImage": "url-or-null",
      "answerType": "MCQ",
      "studentSubmittedMCQId": "wrong-option-uuid",
      "studentSubmittedGridInText": null,
      "correctAnswers": [
        {
          "optionId": "correct-option-uuid",
          "answerText": "4"
        }
      ],
      "explanationContent": {
        "pdf": "https://example.com/explanation.pdf",
        "video": "https://example.com/explanation.mp4"
      }
    }
  ]
}
```

---

### 8. Get Attempt Recommendations (Lessons to Review)

**`GET /user/diagnostic-exams/attempts/:attemptId/recommendations`**

Based on the student's incorrect answers, returns a unique list of **lessons** that the student should study or revise, along with their parent chapter and course. Each lesson corresponds to a topic where the student made mistakes.

**URL Parameters:**

| Param       | Type   | Description                       |
| ----------- | ------ | --------------------------------- |
| `attemptId` | string | The UUID of the exam attempt      |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Diagnostic Exam Recommendations generated successfully",
  "data": {
    "recommendedLessonsToStudy": [
      {
        "lessonId": "lesson-uuid-1",
        "lessonName": "Solving Linear Equations",
        "chapter": {
          "id": "chapter-uuid-1",
          "name": "Algebraic Fundamentals"
        },
        "course": {
          "id": "course-uuid-1",
          "name": "SAT Math Prep"
        }
      }
    ]
  }
}
```

---

## Exam Flow Summary

The typical student flow for a diagnostic exam is:

```text
1. GET  /user/diagnostic-exams                    → Browse available exams
2. GET  /user/diagnostic-exams/:id                → View exam details
3. POST /user/diagnostic-exams/:examId/start      → Start the exam (creates attempt)
4. GET  /user/diagnostic-exams/:id/questions       → Fetch all questions at once
5. POST /user/diagnostic-exams/:attemptId/submit  → Submit all answers using the generated attempt ID
6. GET  /user/diagnostic-exams/attempts            → View all past attempts
7. GET  /user/diagnostic-exams/attempts/:attemptId/review          → See wrong answers & explanations
8. GET  /user/diagnostic-exams/attempts/:attemptId/recommendations → See lessons to revise
```

> Steps 6, 7, and 8 can be revisited at any time after submission.
