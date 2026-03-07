# Student Profile API Documentation

Base URL: `/api/user/profile`

> [!NOTE]
> These endpoints require authentication with a valid student token.

---

## Authentication Requirements

- Send a Bearer token in the `Authorization` header
- Only users with the `student` role can access these routes

**Header Example:**

```http
Authorization: Bearer your-jwt-token
```

---

## Profile Endpoints

### 1. Get My Profile

**`GET /api/user/profile`**

Returns the authenticated student's profile details.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Profile fetched successfully",
    "student": {
      "id": "student-uuid",
      "firstname": "Mazen",
      "lastname": "Khairy",
      "nickname": "MazenK",
      "fullName": "Mazen Khairy",
      "email": "mazenkhairy200@gmail.com",
      "phone": "01112345676",
      "parentphone": "01066666666",
      "grade": "10",
      "category": {
        "id": "category-uuid",
        "name": "National Learning"
      },
      "wallet": {
        "balance": 0
      }
    }
  }
}
```

**Behavior:**

- if the wallet does not exist, it is created automatically with `balance: 0`

**Error Responses:**

| Status | Condition |
| --- | --- |
| `401` | Not authenticated |
| `404` | Student not found |

---

### 2. Update My Profile

**`PUT /api/user/profile`**

Updates the authenticated student's editable profile fields.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `firstname` | string | ❌ | Updated first name |
| `lastname` | string | ❌ | Updated last name |
| `nickname` | string | ❌ | Updated nickname |
| `email` | string | ❌ | Updated email |
| `phone` | string | ❌ | Updated phone number |
| `parentphone` | string | ❌ | Updated parent phone number |

**Sample Request:**

```json
{
  "firstname": "Mazen",
  "lastname": "Khairy",
  "nickname": "MazenMath",
  "phone": "01112345670"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "student": {
      "id": "student-uuid",
      "firstname": "Mazen",
      "lastname": "Khairy",
      "nickname": "MazenMath",
      "fullName": "Mazen Khairy",
      "email": "mazenkhairy200@gmail.com",
      "phone": "01112345670",
      "parentphone": "01066666666",
      "grade": "10",
      "category": {
        "id": "category-uuid",
        "name": "National Learning"
      },
      "wallet": {
        "balance": 0
      }
    }
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | No data to update |
| `400` | Email already exists |
| `401` | Not authenticated |
| `404` | Student not found |

---

### 3. Change My Password

**`PUT /api/user/profile/change-password`**

Changes the authenticated student's password.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `oldPassword` | string | ✅ | Current password |
| `newPassword` | string | ✅ | New password |

**Sample Request:**

```json
{
  "oldPassword": "student123",
  "newPassword": "newStrongPassword123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | `oldPassword` and `newPassword` are required |
| `400` | Old password is not valid |
| `401` | Not authenticated |
| `404` | Student not found |

---

## Current Route Summary

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/user/profile` | Get authenticated student profile |
| `PUT` | `/api/user/profile` | Update authenticated student profile |
| `PUT` | `/api/user/profile/change-password` | Change authenticated student password |
