# Semester Hierarchy API Documentation

This documentation outlines the updated schema architecture and API request/response payloads for the Courses, Semesters, and Chapters endpoints.

**Base URL Context:** All endpoints exist under the `/admin` prefix (e.g., `/admin/courses`).

---

## 1. Courses API (`/admin/courses`)

Courses act as the definitive parent entity for Semesters and Chapters. Each course maps directly to a specific leaf category (e.g. `Middle 1`) and can optionally contain Semesters.

### Create Course
`POST /admin/courses`

Creates a new course and allows inline creation of Semesters and binding of Teachers via junction.

**Request Body (JSON / FormData)**
```json
{
  "name": "Middle 1 Mathematics",
  "categoryId": "uuid-of-middle-category",
  "duration": "9 months",
  "price": 600,
  "discount": 50,
  "description": "Full mathematics curriculum",
  "preRequisition": "Primary 6",
  "whatYouGain": "Algebra fundamentals",
  "isHaveSemester": true,
  "teacherIds": ["uuid-of-teacher"],
  "semesters": [
    { "name": "Semester 1" },
    { "name": "Semester 2" }
  ]
}
```
*Note: `image` (File) is also accepted if using FormData.*

**Response (200 OK)**
```json
{
  "message": "Course created successfully",
  "courseId": "uuid-of-new-course"
}
```

### Update Course
`PUT /admin/courses/:id`

Updates course metadata. If `isHaveSemester` is modified or the `semesters` array is provided, it synchronizes the related Semesters. Passing `semesters` with existing `id`s will update them; passing objects without `id`s will insert new Semesters. Setting `isHaveSemester: false` drops all existing semesters for this course.

**Request Body**
```json
{
  "isHaveSemester": true,
  "semesters": [
    { "id": "uuid-of-existing-sem", "name": "Updated Semester 1" },
    { "name": "Newly Added Semester 3" }
  ]
}
```

### Get Course By ID
`GET /admin/courses/:id`

Returns course details alongside a nested array of its strictly tied `semesters` and `teachers`.

---

## 2. Semesters API (`/admin/semester`)

Semesters represent terms within a specific academic Course. They no longer link to `Category`, but directly strict-bind to `Course`.

### Create Semester
`POST /admin/semester`

Creates a semester standalone, explicitly binding it to a Course.

**Request Body**
```json
{
  "name": "Semester 1",
  "courseId": "uuid-of-parent-course"
}
```

### Get All Semesters
`GET /admin/semester`

Fetches all semesters, deeply populated with their parent course details.

**Response**
```json
{
  "data": [
    {
      "id": "uuid-of-semester",
      "name": "Semester 1",
      "courseId": "uuid-of-parent-course",
      "course": {
        "id": "uuid-of-parent-course",
        "name": "Middle 1 Mathematics"
      }
    }
  ]
}
```

---

## 3. Chapters API (`/admin/chapters`)

Chapters belong to a specific Course, and can optionally belong to a specific Semester.

### Create Chapter
`POST /admin/chapters`

**Request Body**
```json
{
  "name": "Linear Equations",
  "courseId": "uuid-of-middle-1-course",
  "semesterId": "optional-uuid-of-semester",
  "teacherId": "uuid-of-assigned-teacher",
  "duration": "3 weeks",
  "price": 80,
  "discount": 10,
  "description": "Introduction to Linear Eq.",
  "preRequisition": "None",
  "whatYouGain": "Solving variable equations"
}
```
*Note: If `semesterId` is provided, the API validates that the Semester legitimately belongs to the provided `courseId`.*

### Get Chapter Details & Lists
`GET /admin/chapters` or `GET /admin/chapters/:id`

The Chapter entity is fully populated with `course`, `category`, `teacher`, and the optional `semester` objects.

**Sample Response Node:**
```json
{
  "chapter": {
    "id": "uuid",
    "name": "Linear Equations"
  },
  "course": {
    "id": "uuid",
    "name": "Middle 1 Mathematics"
  },
  "semester": {
    "id": "uuid",
    "name": "Semester 1"
  }
}
```
