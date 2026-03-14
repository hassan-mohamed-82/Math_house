# Sessions API Documentation

Base URL: `/admin/session`

> [!NOTE]
> All endpoints require authentication and `admin` authorization.

---

## 1. Session Management

### 1.1 Create Session

**`POST /admin/session`**

Creates a new session.

**Request Body:**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Name of the session. |
| `sessionDate` | String | Yes | Date of the session (e.g., `YYYY-MM-DD`). |
| `timeFrom` | String | Yes | Start time of the session (e.g., `HH:MM:SS`). |
| `timeTo` | String | Yes | End time of the session (e.g., `HH:MM:SS`). |
| `type` | String | Yes | Type of the session: `"private"` or `"group"`. |
| `groupId` | String | conditional | Required if `type` is `"group"`. The ID of the group. |
| `teacherId` | String | Yes | The ID of the teacher assigned. |
| `session_link` | String | Yes | The link to the online session meeting. |
| `material_link` | String | No | The link to the session materials for students. |
| `teacher_material_link` | String | No | The link to materials designated for the teacher. |
| `sessionRelationalType` | String | Yes | The relational type of the session. |
| `lessonIds` | Array<String> | Yes | Array of Lesson IDs to cover. Must not be empty. |
| `studentIds` | Array<String> | conditional | Required for `"private"` sessions (must be exactly 1 element). For `"group"` sessions, optional extra student IDs to inject alongside standard group members. |

**Success Response (201 Created):**

```json
{
    "success": true,
    "data": {
        "message": "Private session created successfully"
    }
}
```

---

### 1.2 Get All Sessions

**`GET /admin/session`**

Retrieves a list of all sessions along with their associated group and teacher details.

**Success Response (200 OK):**

```json
{
    "success": true,
    "data": {
        "sessions": [
            {
                "id": "uuid",
                "name": "Session Name",
                "sessionDate": "2024-03-14",
                "timeFrom": "10:00:00",
                "timeTo": "12:00:00",
                "type": "group",
                "groupId": "uuid",
                "teacherId": "uuid",
                "session_link": "https://link.com",
                "material_link": "https://link.com",
                "teacher_material_link": "https://link.com",
                "sessionRelationalType": "lesson",
                "createdAt": "2024-03-14T00:00:00Z",
                "updatedAt": "2024-03-14T00:00:00Z",
                "groups": {
                    "id": "uuid",
                    "name": "Group Name"
                },
                "teacher": {
                    "id": "uuid",
                    "name": "Teacher Name"
                }
            }
        ]
    }
}
```

---

### 1.3 Get Session By ID

**`GET /admin/session/:id`**

Retrieves a single session by its `id`, including populated values for groups, teachers, lessons, and students.

---

### 1.4 Update Session

**`PUT /admin/session/:id`**

Updates an existing session dynamically. Only passing fields that need to be updated is necessary. Supplying arrays for relations (`lessonIds` or `studentIds`) will overwrite and completely replace the old relations.

**Request Body (All fields are optional):**

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Name of the session. |
| `sessionDate` | String | Date of the session (e.g., `YYYY-MM-DD`). |
| `timeFrom` | String | Start time of the session (e.g., `HH:MM:SS`). |
| `timeTo` | String | End time of the session (e.g., `HH:MM:SS`). |
| `teacherId` | String | The ID of the teacher assigned. |
| `session_link` | String | The link to the online session meeting. |
| `material_link` | String | The link to the session materials for students. |
| `teacher_material_link` | String | The link to materials designated for the teacher. |
| `lessonIds` | Array<String> | Overwrite mapping of Lesson IDs wrapped by this session. |
| `studentIds` | Array<String> | Overwrites mapping of Student IDs enrolled. If session is `"group"`, it properly maintains base group members while overriding ad-hoc additions. |

---

### 1.5 Delete Session

**`DELETE /admin/session/:id`**

Removes a session along with its associative link mappings (`sessionLessons`, `sessionUsers`, `sessionRatings`, `sessionAttendance`).

**Success Response (200 OK):**

```json
{
    "success": true,
    "data": {
        "message": "Session deleted successfully"
    }
}
```

---

## 2. Selection / Dropdown Options Endpoints 

These endpoints are meant to populate form dropdowns efficiently by limiting query sizes.

### 2.1 Get Categories (Leaf only & Grouped)

**`GET /admin/session/select/category`**

Returns leaf-only categories that represent the end-nodes of standard hierarchy, grouped by their largest root ancestor.

**Success Response (200 OK):**

```json
{
    "success": true,
    "data": {
        "categories": [
            {
                "root": "National Learning",
                "children": [
                    {
                        "id": "uuid",
                        "name": "National Learning > Secondary"
                    }
                ]
            }
        ]
    }
}
```

### 2.2 Select Course By Category

**`GET /admin/session/select/course/:categoryId`**

### 2.3 Select Chapter By Course

**`GET /admin/session/select/chapter/:courseId`**

### 2.4 Select Lesson By Chapter

**`GET /admin/session/select/lesson/:chapterId`**

### 2.5 Select Students Filter

**`GET /admin/session/select/students`**

Retrieves a list of filtered students formatted for multi-select component injections. Concatenates first and last name.

**Query Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `grade` | String | No | Numeric enum string (e.g. `"1"` through `"13"`) representing grade level. |
| `categoryId` | String | No | Filter by category ID. |
| `search` | String | No | Partial string `LIKE` match lookup scanning: `firstname`, `lastname`, `email`, and `phone`. |

**Success Response (200 OK):**

```json
{
    "success": true,
    "data": {
        "students": [
            {
                "id": "uuid",
                "name": "John Doe"
            }
        ]
    }
}
```
