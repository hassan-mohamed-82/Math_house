# Promo Codes API Documentation

**Base URL**: `/admin/promoCodes`

**Authentication**: Required (Requires `admin` or `teacher` role)

## 1. Create a Promo Code
Creates a new promo code linking a specific course and package with a set number of usages and duration.

- **Method**: `POST`
- **Endpoint**: `/`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Body** (`application/json`):
```json
{
  "promoName": "Summer Sale",
  "code": "SUMMER20",
  "discountAmount": 20,
  "courseIds": ["uuid-string-1", "uuid-string-2"],
  "packageIds": ["uuid-string-1"],
  "startDate": "2026-06-01",
  "endDate": "2026-08-31",
  "numberOfUsages": 50
}
```
- **Responses**:
  - `201 Created`
  ```json
  {
    "status": true,
    "message": "Promo code created successfully"
  }
  ```
  - `400 Bad Request` (Missing fields, invalid dates, negative values, or code already exists)
  - `404 Not Found` (Course or package doesn't exist)

---

## 2. Get All Promo Codes
Retrieves a list of all existing promo codes along with basic details of their associated course, package, and how many users have redeemed them so far.

- **Method**: `GET`
- **Endpoint**: `/`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Responses**:
  - `200 OK`
  ```json
  {
    "status": true,
    "message": "Promo codes fetched successfully",
    "data": [
      {
        "id": "uuid-string",
        "promoName": "Summer Sale",
        "code": "SUMMER20",
        "discountAmount": 20,
        "startDate": "2026-06-01",
        "endDate": "2026-08-31",
        "numberOfUsagesAllowed": 50,
        "courses": [
          {
            "id": "uuid-string-1",
            "courseName": "Math 101"
          },
          {
            "id": "uuid-string-2",
            "courseName": "Data Structures"
          }
        ],
        "packages": [
          {
            "id": "uuid-string-1",
            "packageName": "Live Session Package"
          }
        ],
        "numberOfUsers": 0
      }
    ]
  }
  ```

---

## 3. Get Promo Code by ID
Retrieves details for a specific promo code by its ID.

- **Method**: `GET`
- **Endpoint**: `/:id`
- **Headers**:
  - `Authorization: Bearer <token>`
- **URL Parameters**:
  - `id` (string): The UUID of the promo code
- **Responses**:
  - `200 OK`
  ```json
  {
    "status": true,
    "message": "Promo code fetched successfully",
    "data": [
      {
        "id": "uuid-string",
        "promoName": "Summer Sale",
        // ... same block as `GetAll`
      }
    ]
  }
  ```
  - `400 Bad Request` (Invalid ID provided)
  - `404 Not Found` (Promo code does not exist)

---

## 4. Update Promo Code
Updates an existing promo code. All fields in the body are optional; only provided fields will be updated.

- **Method**: `PUT`
- **Endpoint**: `/:id`
- **Headers**:
  - `Authorization: Bearer <token>`
- **URL Parameters**:
  - `id` (string): The UUID of the promo code
- **Body** (`application/json`) - *All fields optional*:
```json
{
  "promoName": "Extended Summer Sale",
  "code": "SUMMER20X",
  "discountAmount": 25,
  "courseIds": ["new-uuid-string-1"],
  "packageIds": ["new-uuid-string-1", "new-uuid-string-2"],
  "startDate": "2026-06-01",
  "endDate": "2026-09-30",
  "numberOfUsages": 100
}
```
- **Responses**:
  - `200 OK`
  ```json
  {
    "status": true,
    "message": "Promo code updated successfully"
  }
  ```
  - `400 Bad Request` (Invalid ID, code already exists, start date > end date, negative usages/discount)
  - `404 Not Found` (Target promo code, course, or package does not exist)

---

## 5. Delete Promo Code
Deletes a specific promo code. It will also safely clear any associations between the promo code and users before deleting it.

- **Method**: `DELETE`
- **Endpoint**: `/:id`
- **Headers**:
  - `Authorization: Bearer <token>`
- **URL Parameters**:
  - `id` (string): The UUID of the promo code to delete
- **Responses**:
  - `200 OK`
  ```json
  {
    "status": true,
    "message": "Promo code deleted successfully"
  }
  ```
  - `400 Bad Request` (Invalid ID provided)
  - `404 Not Found` (Promo code not found)
