# Payments API Documentation

Base URL: `/api`

> [!NOTE]
> This document covers the wallet recharge and recharge review flows currently implemented in the payment controllers.

> [!TIP]
> These payment routes are mounted and available through the admin and user routers.

---

## Authentication Requirements

### Student Endpoints

- Require a valid student Bearer token
- Expected role: `student`

### Admin Endpoints

- Require a valid admin Bearer token
- Expected role: `admin`

**Header Example:**

```http
Authorization: Bearer your-jwt-token
```

---

## Payment Status Lifecycle

Recharge requests move through these statuses:

- `pending`: request submitted by the student
- `completed`: request approved by admin
- `rejected`: request rejected by admin

In the admin grouped list response:

- `accepted` maps to stored status `completed`

---

## Student Payment Endpoints

Base path: `/api/user/wallet`

### 1. Create Wallet Recharge Request

**`POST /api/user/wallet/recharge`**

Creates a wallet recharge request for the authenticated student.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `paymentMethodId` | string | ✅ | Payment method ID |
| `amount` | number | ✅ | Recharge amount, must be greater than `0` |
| `receiptImg` | string | ✅ | Base64 receipt image |

**Important Behavior:**

- `receiptImg` is always required
- receipt images are stored and saved as a URL in `payment.receiptImg`
- the student must have a linked parent account through `parentphone`
- the created payment record is stored with:
	- `source = "student"`
	- `purpose = "wallet_recharge"`
	- `status = "pending"` by default

**Sample Request:**

```json
{
	"paymentMethodId": "pm_123456",
	"amount": 250,
	"receiptImg": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}
```

**Success Response (201):**

```json
{
	"success": true,
	"data": {
		"message": "Wallet recharge request created successfully"
	}
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Payment method, amount, and receipt image are required |
| `400` | Amount must be greater than zero |
| `400` | Payment method is not active |
| `401` | Student not logged in |
| `404` | Payment method not found |
| `404` | Student not found |
| `404` | Parent account not linked |

---

### 2. Get Wallet Transactions

**`GET /api/user/wallet/transactions`**

Returns paginated wallet transactions for the authenticated student.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `page` | number | ❌ | `1` | Page number |
| `limit` | number | ❌ | `10` | Items per page |
| `search` | string | ❌ | — | Search by transaction fields |

**Search Matches Against:**

- `paymentId`
- transaction `type`
- transaction `source`
- payment `status`
- transaction `amount`

**Sample Request:**

```http
GET /api/user/wallet/transactions?page=1&limit=10&search=deposit
```

**Success Response (200):**

```json
{
	"success": true,
	"data": {
		"message": "Wallet transactions retrieved successfully",
		"transactions": [
			{
				"id": "txn_123",
				"amount": 250,
				"type": "deposit",
				"source": "Student",
				"createdAt": "2026-03-09T12:00:00.000Z",
				"paymentId": "pay_123",
				"paymentStatus": "completed",
				"paymentReceiptImg": "https://example.com/uploads/payment_receipts/receipt.png"
			}
		],
		"pagination": {
			"total": 1,
			"page": 1,
			"limit": 10,
			"totalPages": 1
		}
	}
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `401` | Student not logged in |
| `404` | Wallet not found |

---

## Admin Payment Endpoints

Base path: `/api/admin/payment`

### 3. Get Recharge Requests

**`GET /api/admin/payment/recharge-requests`**

Returns paginated recharge requests grouped by status.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `page` | number | ❌ | `1` | Page number |
| `limit` | number | ❌ | `10` | Items per page |
| `search` | string | ❌ | — | Search recharge requests |

**Search Matches Against:**

- `payment.id`
- `payment.studentId`
- student `firstname`
- student `lastname`
- student `nickname`
- student `email`
- student `phone`

**Sample Request:**

```http
GET /api/admin/payment/recharge-requests?page=1&limit=10&search=ahmed
```

**Success Response (200):**

```json
{
	"success": true,
	"data": {
		"message": "Recharge requests retrieved successfully",
		"data": {
			"pending": [
				{
					"id": "pay_001",
					"amount": 250,
					"status": "pending",
					"createdAt": "2026-03-09T12:00:00.000Z",
					"studentId": "student_001",
					"receiptImg": "https://example.com/uploads/payment_receipts/receipt.png",
					"source": "student",
					"purpose": "wallet_recharge",
					"student": {
						"id": "student_001",
						"firstname": "Ahmed",
						"lastname": "Ali",
						"nickname": "AhmedA",
						"email": "ahmed@student.com",
						"phone": "01112345678"
					}
				}
			],
			"accepted": [],
			"rejected": []
		},
		"pagination": {
			"total": 1,
			"page": 1,
			"limit": 10,
			"totalPages": 1
		}
	}
}
```

**Notes:**

- `accepted` contains requests whose stored status is `completed`
- grouping is applied after the current page of results is fetched

**Error Responses:**

This endpoint currently has no explicit custom validation errors in the controller beyond authentication/authorization middleware.

---

### 4. Reply to Recharge Request

**`POST /api/admin/payment/recharge/:id/reply`**

Approves or rejects a pending recharge request.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | ✅ | Payment request ID |

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `action` | string | ✅ | Must be `approve` or `reject` |

**Sample Request:**

```json
{
	"action": "approve"
}
```

**Success Response (200):**

```json
{
	"success": true,
	"data": {
		"message": "Payment request has been completed"
	}
}
```

**Behavior on Approval:**

- payment status becomes `completed`
- the student wallet balance is increased by the payment amount
- a wallet transaction is created with:
	- `type = "deposit"`
	- `source = "Student"`

**Behavior on Rejection:**

- payment status becomes `rejected`
- wallet balance is not changed

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Payment ID is required |
| `400` | Action must be either `approve` or `reject` |
| `400` | Payment request not found |
| `400` | Only pending payment requests can be processed |
| `400` | Associated student not found for this payment |
| `400` | Amount must be greater than zero to add to wallet |
| `400` | Wallet not found for this student |

---

## Suggested Route Summary

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/user/wallet/recharge` | Student creates a wallet recharge request |
| `GET` | `/api/user/wallet/transactions` | Student gets paginated wallet transactions |
| `GET` | `/api/admin/payment/recharge-requests` | Admin gets grouped recharge requests |
| `POST` | `/api/admin/payment/recharge/:id/reply` | Admin approves or rejects a recharge request |

---

## Related Endpoints

If the client needs available payment methods before recharge submission, see the payment method endpoints under:

- `/api/admin/paymentMethod`

