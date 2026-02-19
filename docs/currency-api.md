# 💱 Currency API Documentation

**Base URL:** `/api/admin/currency`

---

## Database Schema

### `currency` Table

| Column          | Type              | Description                              |
|-----------------|-------------------|------------------------------------------|
| `id`            | `CHAR(255)` PK    | UUID, auto-generated                     |
| `name`          | `VARCHAR(255)`    | Currency name (e.g. "US Dollar")         |
| `symbol`        | `VARCHAR(255)`    | Currency symbol (e.g. "$")               |
| `code`          | `VARCHAR(10)` UQ  | ISO code, stored uppercase (e.g. "USD")  |
| `exchange_rate` | `DECIMAL(18,6)`   | Rate relative to the base currency       |
| `is_base`       | `BOOLEAN`         | `true` for the base currency (only one)  |
| `created_at`    | `TIMESTAMP`       | Auto-set on creation                     |
| `updated_at`    | `TIMESTAMP`       | Auto-updated on modification             |

### `conversion_rate` Table (Historical Log)

| Column             | Type            | Description                                |
|--------------------|-----------------|--------------------------------------------|
| `id`               | `CHAR(255)` PK  | UUID, auto-generated                       |
| `from_currency_id` | `CHAR(255)` FK  | References `currency.id` (cascade delete)  |
| `to_currency_id`   | `CHAR(255)` FK  | References `currency.id` (cascade delete)  |
| `rate`             | `DECIMAL(18,6)` | The exchange rate at time of fetch         |
| `fetched_at`       | `TIMESTAMP`     | Auto-set on insertion                      |

---

## Endpoints

### 1. Create Currency

```
POST /api/admin/currency
```

Creates a new currency. If `isBase` is `true`, the current base currency is unset first.

**Request Body:**

| Field          | Type      | Required | Description                               |
|----------------|-----------|----------|-------------------------------------------|
| `name`         | `string`  | ✅       | Currency name                             |
| `symbol`       | `string`  | ✅       | Currency symbol                           |
| `code`         | `string`  | ✅       | ISO currency code (auto-uppercased)       |
| `exchangeRate` | `string`  | ❌       | Rate relative to base (default `1.000000`)|
| `isBase`       | `boolean` | ❌       | Set as the base currency (default `false`)|

**Success Response:** `201`

```json
{
    "success": true,
    "data": {
        "message": "Currency created successfully"
    }
}
```

**Error Cases:**

- `400` — Missing `name`, `symbol`, or `code`
- `400` — Duplicate currency code

---

### 2. Get All Currencies

```
GET /api/admin/currency
```

Returns all currencies in the system.

**Success Response:** `200`

```json
{
    "success": true,
    "data": {
        "message": "Currencies fetched successfully",
        "data": [
            {
                "id": "uuid-string",
                "name": "US Dollar",
                "symbol": "$",
                "code": "USD",
                "exchangeRate": "1.000000",
                "isBase": true,
                "createdAt": "2026-02-19T00:00:00.000Z",
                "updatedAt": "2026-02-19T00:00:00.000Z"
            }
        ]
    }
}
```

---

### 3. Get Currency by ID

```
GET /api/admin/currency/:id
```

**Path Parameters:**

| Param | Type     | Description  |
|-------|----------|--------------|
| `id`  | `string` | Currency UUID|

**Success Response:** `200`

```json
{
    "success": true,
    "data": {
        "message": "Currency fetched successfully",
        "data": {
            "id": "uuid-string",
            "name": "US Dollar",
            "symbol": "$",
            "code": "USD",
            "exchangeRate": "1.000000",
            "isBase": true,
            "createdAt": "2026-02-19T00:00:00.000Z",
            "updatedAt": "2026-02-19T00:00:00.000Z"
        }
    }
}
```

**Error Cases:**

- `400` — Currency not found

---

### 4. Update Currency

```
PUT /api/admin/currency/:id
```

Updates a currency's properties. All body fields are optional — only provided fields are updated.

**Path Parameters:**

| Param | Type     | Description  |
|-------|----------|--------------|
| `id`  | `string` | Currency UUID|

**Request Body:**

| Field          | Type     | Required | Description                        |
|----------------|----------|----------|------------------------------------|
| `name`         | `string` | ❌       | New currency name                  |
| `symbol`       | `string` | ❌       | New currency symbol                |
| `code`         | `string` | ❌       | New ISO code (auto-uppercased)     |
| `exchangeRate` | `string` | ❌       | New exchange rate                  |

**Success Response:** `200`

```json
{
    "success": true,
    "data": {
        "message": "Currency updated successfully"
    }
}
```

**Error Cases:**

- `400` — Currency not found
- `400` — Duplicate currency code (if updating `code`)

---

### 5. Delete Currency

```
DELETE /api/admin/currency/:id
```

Deletes a currency. **Cannot delete the base currency** — you must reassign the base first.

**Path Parameters:**

| Param | Type     | Description  |
|-------|----------|--------------|
| `id`  | `string` | Currency UUID|

**Success Response:** `200`

```json
{
    "success": true,
    "data": {
        "message": "Currency deleted successfully"
    }
}
```

**Error Cases:**

- `400` — Currency not found
- `400` — Cannot delete the base currency

---

### 6. Set Base Currency

```
PUT /api/admin/currency/base/:id
```

Changes the base currency. The previous base is unset, the new base's rate is set to `1.000000`, and all other currencies are recalculated using live rates from the [Exchange Rate API](https://open.er-api.com).

**Path Parameters:**

| Param | Type     | Description  |
|-------|----------|--------------|
| `id`  | `string` | Currency UUID|

**Success Response:** `200`

```json
{
    "success": true,
    "data": {
        "message": "Base currency changed to US Dollar"
    }
}
```

**Error Cases:**

- `400` — Currency not found
- `400` — Currency is already the base

> [!NOTE]
> If the external API call fails, the base is still changed but rates for other currencies won't be recalculated until the next refresh.

---

### 7. Fetch Live Rates

```
GET /api/admin/currency/rates/live
```

Fetches live exchange rates from the external API, updates all non-base currencies in the database, and logs each rate to the `conversion_rate` history table.

**Success Response:** `200`

```json
{
    "success": true,
    "data": {
        "message": "Exchange rates updated successfully",
        "data": {
            "base": "USD",
            "lastUpdated": "Thu, 19 Feb 2026 00:00:01 +0000",
            "rates": [
                { "code": "EUR", "rate": 0.924512 },
                { "code": "EGP", "rate": 50.654321 }
            ]
        }
    }
}
```

**Error Cases:**

- `400` — No base currency is set
- `400` — External API returned a non-success result

---

### 8. Convert Amount

```
POST /api/admin/currency/convert
```

Converts an amount from one currency to another using stored exchange rates.

**Conversion formula:** `result = (amount / fromRate) × toRate`

**Request Body:**

| Field    | Type     | Required | Description                |
|----------|----------|----------|----------------------------|
| `amount` | `number` | ✅       | Amount to convert (> 0)    |
| `from`   | `string` | ✅       | Source currency ID (UUID)   |
| `to`     | `string` | ✅       | Target currency ID (UUID)   |

**Success Response:** `200`

```json
{
    "success": true,
    "data": {
        "message": "Conversion successful",
        "data": {
            "from": {
                "id": "uuid-usd",
                "code": "USD",
                "name": "US Dollar",
                "symbol": "$"
            },
            "to": {
                "id": "uuid-egp",
                "code": "EGP",
                "name": "Egyptian Pound",
                "symbol": "ج.م"
            },
            "amount": 100,
            "convertedAmount": 5065.432100,
            "rate": 50.654321
        }
    }
}
```

**Error Cases:**

- `400` — Missing `amount`, `from`, or `to`
- `400` — Amount must be a positive number
- `400` — Source / Target currency not found
- `400` — Source currency exchange rate is zero

---

## Cron Job: Auto-Refresh Rates

Exchange rates are automatically refreshed via a cron job configured in `src/jobs/cronJobs.ts`.

| Behavior             | Detail                                                           |
|----------------------|------------------------------------------------------------------|
| **On server start**  | Rates are refreshed immediately                                  |
| **Schedule**         | Every **6 hours** (`0 */6 * * *`)                                |
| **External API**     | [open.er-api.com](https://open.er-api.com/v6/latest)             |
| **What it does**     | Updates all non-base currency rates and logs to `conversion_rate`|
| **Error handling**   | Failures are logged to console; the server continues running     |
