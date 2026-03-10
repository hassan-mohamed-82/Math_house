# Payments API Documentation

Base URL: `/api`

> [!NOTE]
> This document covers the wallet recharge, package purchase, Paymob callback, and admin payment review flows currently implemented in the payment controllers.

> [!TIP]
> These routes are mounted through the public, user, and admin routers.

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

Payments move through these statuses:

- `pending`: request created and waiting for approval or callback completion
- `completed`: payment accepted and applied
- `rejected`: payment rejected manually or by payment callback

In the admin grouped responses:

- `accepted` maps to stored status `completed`

---

## Student Wallet Endpoints

Base path: `/api/user/wallet`

### 1. Create Manual Wallet Recharge Request

**`POST /api/user/wallet/recharge`**

Creates a manual wallet recharge request for the authenticated student.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `paymentMethodId` | string | ✅ | Manual payment method ID |
| `amount` | number | ✅ | Recharge amount, must be greater than `0` |
| `receiptImg` | string | ✅ | Base64 receipt image |

**Important Behavior:**

- only supports payment methods whose type is `Manual`
- the student must have a linked parent account through `parentphone`
- the receipt image is stored and saved as a URL in `payment.receiptImg`
- the created payment row is stored with:
  - `source = "student"`
  - `purpose = "wallet_recharge"`
  - `status = "pending"` by default

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
| `400` | Use the automatic recharge endpoint for automatic payment methods |
| `401` | Student not logged in |
| `404` | Payment method not found |
| `404` | Student not found |
| `404` | Parent not found |

---

### 2. Initialize Automatic Wallet Recharge

**`POST /api/user/wallet/recharge/automatic`**

Creates a Paymob checkout session for an automatic wallet recharge.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `paymentMethodId` | string | ✅ | Automatic payment method ID |
| `amount` | number | ✅ | Recharge amount, must be greater than `0` |

**Important Behavior:**

- only supports payment methods whose type is `Automatic`
- the current automatic gateway implementation supports `Paymob` only
- a pending payment row is created before the checkout session is returned
- on successful callback, the payment is marked as `completed` and the wallet is credited automatically
- on callback failure, the payment is marked as `rejected`

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "message": "Automatic payment session created successfully",
    "paymentId": "payment_uuid",
    "paymentMethod": "Paymob",
    "checkoutUrl": "https://accept.paymob.com/api/acceptance/iframes/...",
    "iframeUrl": "https://accept.paymob.com/api/acceptance/iframes/...",
    "paymobOrderId": 123456789,
    "callbackUrl": "http://localhost:3000/api/payment/paymob/callback"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Payment method and amount are required |
| `400` | Amount must be greater than zero |
| `400` | Payment method is not active |
| `400` | Selected payment method is not an automatic payment method |
| `400` | Automatic payments are currently available only through Paymob |
| `400` | Failed to initialize automatic payment |
| `401` | Student not logged in |
| `404` | Payment method not found |
| `404` | Student not found |

---

### 3. Get Wallet Transactions

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

## Student Package Payment Endpoints

Base path: `/api/user/payment`

### 4. Create Manual Package Buy Request

**`POST /api/user/payment/package-buy`**

Creates a manual package purchase request for the authenticated student.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `packageId` | string | ✅ | Package ID |
| `paymentMethodId` | string | ✅ | Manual payment method ID |
| `receiptImg` | string | ✅ | Base64 receipt image |

**Important Behavior:**

- only supports payment methods whose type is `Manual`
- the package price is stored in `payment.amount`
- the package ID is stored in `payment.packageId`
- the receipt image is stored and saved as a URL in `payment.receiptImg`
- the student must have a linked parent account through `parentphone`
- the created payment row is stored with:
  - `source = "student"`
  - `purpose = "purchase"`
  - `status = "pending"` by default

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "message": "Package buy request created successfully"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Package ID, Payment Method ID, and receipt image are required |
| `400` | Payment method is not active |
| `400` | Use the automatic recharge endpoint for automatic payment methods |
| `400` | Student does not have a parent phone number |
| `401` | Student not logged in |
| `404` | Package not found |
| `404` | Payment method not found |
| `404` | Student not found |
| `404` | Parent not found |

---

### 5. Initialize Automatic Package Buy

**`POST /api/user/payment/package-buy/automatic`**

Creates a Paymob checkout session for an automatic package purchase.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `packageId` | string | ✅ | Package ID |
| `paymentMethodId` | string | ✅ | Automatic payment method ID |

**Important Behavior:**

- only supports payment methods whose type is `Automatic`
- the current automatic gateway implementation supports `Paymob` only
- a pending payment row is created before the checkout session is returned
- the payment row is stored with `purpose = "purchase"`
- on successful callback, the purchased package balance is credited automatically based on package type:
  - `live` increments `Student.livebalance`
  - `exam` increments `Student.exambalance`
  - `question` increments `Student.questionbalance`

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "message": "Automatic package payment session created successfully",
    "paymentId": "payment_uuid",
    "packageId": "package_uuid",
    "paymentMethod": "Paymob",
    "checkoutUrl": "https://accept.paymob.com/api/acceptance/iframes/...",
    "iframeUrl": "https://accept.paymob.com/api/acceptance/iframes/...",
    "paymobOrderId": 123456789,
    "callbackUrl": "http://localhost:3000/api/payment/paymob/callback"
  }
}
```

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Package ID and payment method ID are required |
| `400` | Package price is invalid |
| `400` | Payment method is not active |
| `400` | Selected payment method is not an automatic payment method |
| `400` | Automatic payments are currently available only through Paymob |
| `400` | Failed to initialize automatic package payment |
| `401` | Student not logged in |
| `404` | Package not found |
| `404` | Payment method not found |
| `404` | Student not found |

---

### 6. Get Package Buy History

**`GET /api/user/payment/package-buy/history`**

Returns paginated package purchase history for the authenticated student.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `page` | number | ❌ | `1` | Page number |
| `limit` | number | ❌ | `10` | Items per page |
| `search` | string | ❌ | — | Search package purchase history |

**Search Matches Against:**

- payment `status`
- package `name`
- package `type`
- payment method `name`
- payment method `type`
- payment `amount`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Package buy history retrieved successfully",
    "history": [
      {
        "id": "payment_uuid",
        "amount": 250,
        "status": "completed",
        "createdAt": "2026-03-09T12:00:00.000Z",
        "receiptImg": "https://example.com/uploads/payment_receipts/receipt.png",
        "source": "student",
        "package": {
          "id": "package_uuid",
          "name": "Live 10 Classes",
          "type": "live",
          "number": 10,
          "price": "250.00"
        },
        "paymentMethod": {
          "id": "pm_uuid",
          "name": "Paymob",
          "type": "Automatic"
        }
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

---

## Public Paymob Callback Endpoint

Base path: `/api/payment`

### 7. Handle Paymob Callback

**`GET /api/payment/paymob/callback`**

**`POST /api/payment/paymob/callback`**

Public endpoint used by Paymob to finalize automatic payments.

**Important Behavior:**

- validates the Paymob HMAC signature
- identifies the local payment using Paymob `merchant_order_id`
- rejects mismatched payment amounts
- returns `pending` if Paymob reports the transaction is still pending
- marks the payment as `rejected` when the transaction fails
- marks the payment as `completed` when the transaction succeeds
- supports both `wallet_recharge` and `purchase` payment purposes
- wallet recharges credit the wallet once even if Paymob retries the callback
- package purchases credit the student package balance in a transaction with the payment status update

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Automatic payment completed successfully",
    "paymentId": "payment_uuid",
    "status": "completed"
  }
}
```

**Other Possible Success Responses:**

- `Automatic payment already completed`
- `Payment is still pending`
- `Automatic payment was rejected`

**Error Responses:**

| Status | Condition |
| --- | --- |
| `400` | Invalid Paymob callback payload |
| `400` | Payment request is not configured for automatic payments |
| `400` | Payment amount mismatch |
| `400` | Associated student not found for this payment |
| `400` | Associated package not found for this payment |
| `400` | Unsupported payment purpose |
| `401` | Invalid Paymob callback signature |
| `404` | Payment request not found |

---

## Admin Payment Endpoints

Base path: `/api/admin/payment`

### 8. Get Recharge Requests

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

---

### 9. Reply to Recharge Request

**`POST /api/admin/payment/recharge-requests/:paymentId/reply`**

Approves or rejects a pending manual recharge request.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `paymentId` | string | ✅ | Payment request ID |

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `action` | string | ✅ | Must be `approve` or `reject` |

**Behavior on Approval:**

- payment status becomes `completed`
- the student wallet balance is increased by the payment amount
- a wallet transaction is created if one does not already exist

**Behavior on Rejection:**

- payment status becomes `rejected`
- wallet balance is not changed

**Restriction:**

- automatic payments cannot be approved manually from this endpoint
- automatic payments must be finalized through the Paymob callback route

---

### 10. Get Package Buy Requests

**`GET /api/admin/payment/package-buy-requests`**

Returns paginated package purchase requests grouped by status.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `page` | number | ❌ | `1` | Page number |
| `limit` | number | ❌ | `10` | Items per page |
| `search` | string | ❌ | — | Search package requests |

**Search Matches Against:**

- `payment.studentId`
- student `firstname`
- student `lastname`
- student `nickname`
- student `email`
- student `phone`
- package `name`

**Response Notes:**

- each item includes `receiptImg`, `source`, `purpose`, and a nested `package` object
- package requests are filtered using `purpose = "purchase"`

---

### 11. Reply to Package Buy Request

**`POST /api/admin/payment/package-buy-requests/:paymentId/reply`**

Approves or rejects a pending manual package purchase request.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `paymentId` | string | ✅ | Payment request ID |

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `action` | string | ✅ | Must be `approve` or `reject` |

**Behavior on Approval:**

- payment status becomes `completed`
- the package is loaded from `payment.packageId`
- the student receives package balance according to package type:
  - `live` increments `Student.livebalance`
  - `exam` increments `Student.exambalance`
  - `question` increments `Student.questionbalance`

**Behavior on Rejection:**

- payment status becomes `rejected`
- student balances are not changed

---

## Route Summary

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/user/wallet/recharge` | Create manual wallet recharge request |
| `POST` | `/api/user/wallet/recharge/automatic` | Initialize Paymob wallet recharge |
| `GET` | `/api/user/wallet/transactions` | Get student wallet transactions |
| `POST` | `/api/user/payment/package-buy` | Create manual package buy request |
| `POST` | `/api/user/payment/package-buy/automatic` | Initialize Paymob package purchase |
| `GET` | `/api/user/payment/package-buy/history` | Get student package buy history |
| `GET` | `/api/payment/paymob/callback` | Paymob callback endpoint |
| `POST` | `/api/payment/paymob/callback` | Paymob webhook endpoint |
| `GET` | `/api/admin/payment/recharge-requests` | Get grouped recharge requests |
| `POST` | `/api/admin/payment/recharge-requests/:paymentId/reply` | Reply to recharge request |
| `GET` | `/api/admin/payment/package-buy-requests` | Get grouped package buy requests |
| `POST` | `/api/admin/payment/package-buy-requests/:paymentId/reply` | Reply to package buy request |

---

## Related Endpoints

- Student user routes are mounted under `/api/user`
- Public payment callback routes are mounted under `/api/payment`
- Admin payment review routes are mounted under `/api/admin/payment`