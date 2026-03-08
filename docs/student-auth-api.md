# Student Auth API Documentation

Base URL: `/api/user/auth`

> [!NOTE]
> These endpoints are public and do not require authentication.

---

## Auth Endpoints

### 1. Student Signup

**`POST /api/user/auth/signup`**

Creates a new student account and automatically creates a wallet with `balance: 0`.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `firstname` | string | ✅ | Student first name |
| `lastname` | string | ✅ | Student last name |
| `nickname` | string | ✅ | Student nickname |
| `email` | string | ✅ | Unique student email |
| `password` | string | ✅ | Student password |
| `phone` | string | ✅ | Student phone number |
| `category` | string | ✅ | Main category UUID only, such as `National Learning` or `International Learning` |
| `grade` | string | ✅ | Grade value from `1` to `13` |

**Important Rules:**

- `category` must be a root category only
- subcategories such as `Primary`, `Middle`, `Secondary`, or `IGCSE` are rejected
- wallet is created automatically for the new student

**Sample Request:**

```json
{
  "firstname": "Omar",
  "lastname": "Khaled",
  "nickname": "OmarK",
  "email": "omar.k@student.com",
  "password": "student123",
  "phone": "01112345671",
  "category": "uuid-of-national-learning",
  "grade": "1"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "message": "Student registered successfully"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Missing required fields |
| `400` | Email is already registered |
| `400` | Category not found |
| `400` | Student must be assigned to a main category only |

---

### 2. Student Login

**`POST /api/user/auth/login`**

Authenticates a student and returns a JWT token with student profile data.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | Student email |
| `password` | string | ✅ | Student password |

**Sample Request:**

```json
{
  "email": "omar.k@student.com",
  "password": "student123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Student logged in successfully",
    "token": "jwt-token-here",
    "student": {
      "id": "student-uuid",
      "firstname": "Omar",
      "lastname": "Khaled",
      "email": "omar.k@student.com",
      "phone": "01112345671",
      "category": {
        "id": "category-uuid",
        "name": "National Learning"
      },
      "grade": "1"
    }
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Email and password are required |
| `400` | Invalid Credentials |

---

### 3. Get Signup Selection Data

**`GET /api/user/auth/select`**

Returns the list of allowed main categories and available grades for signup forms.

**Behavior:**

- returns only top-level categories
- does not return subcategories

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Categories and grades fetched successfully",
    "categories": [
      {
        "id": "uuid-1",
        "name": "National Learning",
        "description": "Egyptian national curriculum",
        "image": null
      },
      {
        "id": "uuid-2",
        "name": "International Learning",
        "description": "International curriculum programs",
        "image": null
      }
    ],
    "grades": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]
  }
}
```

---

### 4. Forgot Password

**`POST /api/user/auth/forgot-password`**

Sends a 6-digit password reset code to the provided email if the student account exists.

**Behavior:**

- reset code lifetime is `5 minutes`
- response is intentionally generic for security
- if the email does not exist, the same success message is returned

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | Student email |

**Sample Request:**

```json
{
  "email": "omar.k@student.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password reset instructions sent to email"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Email is required |

---

### 5. Validate Reset Code

**`POST /api/user/auth/validate-reset-code`**

Validates the 6-digit password reset code for the provided email.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | Student email |
| `code` | string | ✅ | 6-digit reset code |

**Sample Request:**

```json
{
  "email": "omar.k@student.com",
  "code": "482913"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Reset code is valid"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Email and reset code are required |
| `400` | Invalid or expired reset code |

---

### 6. Reset Password

**`POST /api/user/auth/reset-password`**

Resets the student password using the email, reset code, and new password.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | Student email |
| `code` | string | ✅ | 6-digit reset code |
| `newPassword` | string | ✅ | New password |

**Sample Request:**

```json
{
  "email": "omar.k@student.com",
  "code": "482913",
  "newPassword": "newStrongPassword123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Email, reset code and newPassword are required |
| `400` | Invalid or expired reset code |

---

## Current Route Summary

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/user/auth/signup` | Register student and create wallet |
| `POST` | `/api/user/auth/login` | Login student |
| `POST` | `/api/user/auth/forgot-password` | Send 6-digit reset code to email |
| `POST` | `/api/user/auth/validate-reset-code` | Validate reset code |
| `POST` | `/api/user/auth/reset-password` | Reset password using code |
| `GET` | `/api/user/auth/select` | Get main categories and grades |
