# Drive API Documentation

Base URL: `/drive`

> [!NOTE]
> Drive admin endpoints require an authenticated admin account with `type = super_admin`.

---

## Authentication

### 1. Drive Super Admin Login

**`POST /drive/auth/login`**

Logs in an admin for Drive access. Only admins with `type = super_admin` can log in here.

**Request Body:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `email` | string | ✅ | Admin email |
| `password` | string | ✅ | Admin password |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Drive login successful",
    "token": "jwt-token",
    "admin": {
      "id": "uuid",
      "name": "Super Admin",
      "email": "admin@example.com",
      "phoneNumber": "0123456789",
      "type": "super_admin",
      "status": "active"
    }
  }
}
```

**Error Responses:**

| Status | Condition |
| ------ | --------- |
| 400 | Missing email or password |
| 401 | Invalid credentials |
| 401 | Admin inactive |
| 401 | Admin is not a `super_admin` |

---

## Admin Drive Management

> [!IMPORTANT]
> The following endpoints require:
> - `Authorization: Bearer <token>`
> - authenticated `admin` role
> - admin record with `type = super_admin`

### 2. Initialize Video Upload

**`POST /drive/upload/init`**

Creates a Bunny video placeholder, generates secure TUS upload credentials, and saves the initial asset record in the local database.

**Request Body:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `videoTitle` | string | ✅ | Video title |
| `folderId` | string | ❌ | Parent drive folder UUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Ready for direct browser upload",
    "uploadCredentials": {
      "libraryId": "613395",
      "videoId": "bunny-video-guid",
      "expirationTime": 1730000000,
      "signature": "sha256-signature"
    }
  }
}
```

**Error Responses:**

| Status | Condition |
| ------ | --------- |
| 400 | Missing `videoTitle` |
| 404 | `folderId` not found |

---

### 3. Get Drive Contents

**`GET /drive/folders/:folderId?`**

Returns folders and files for the root level or for a specific folder.

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `folderId` | string | Optional folder UUID. Omit it to fetch the root contents. |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "currentFolder": {
      "id": "folder-uuid",
      "name": "Math Videos",
      "parentFolderId": null,
      "createdAt": "2026-03-08T12:00:00.000Z",
      "updatedAt": "2026-03-08T12:00:00.000Z"
    },
    "folders": [
      {
        "id": "child-folder-uuid",
        "name": "Algebra",
        "parentFolderId": "folder-uuid",
        "createdAt": "2026-03-08T12:00:00.000Z",
        "updatedAt": "2026-03-08T12:00:00.000Z"
      }
    ],
    "files": [
      {
        "id": "asset-uuid",
        "title": "Lesson 1",
        "type": "video",
        "status": "ready",
        "folderId": "folder-uuid",
        "bunnyGuid": "bunny-video-guid",
        "sourceUrl": null,
        "createdAt": "2026-03-08T12:00:00.000Z",
        "updatedAt": "2026-03-08T12:00:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Condition |
| ------ | --------- |
| 404 | Folder not found |

---

### 4. Create Folder

**`POST /drive/folders`**

Creates a new root or nested drive folder.

**Request Body:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `name` | string | ✅ | Folder name |
| `parentFolderId` | string | ❌ | Parent folder UUID |
| `folderId` | string | ❌ | Alias for `parentFolderId` |

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "message": "Folder created successfully",
    "folder": {
      "id": "folder-uuid",
      "name": "Algebra",
      "parentFolderId": null,
      "createdAt": "2026-03-08T12:00:00.000Z",
      "updatedAt": "2026-03-08T12:00:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Condition |
| ------ | --------- |
| 400 | Missing folder name |
| 400 | Duplicate folder name in same location |
| 404 | Parent folder not found |

---

### 5. Delete Video

**`DELETE /drive/files/:videoId`**

Deletes a video from Bunny Stream and removes its local database record.

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `videoId` | string | Local asset UUID or Bunny video GUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Video permanently deleted from Drive and Storage",
    "video": {
      "id": "asset-uuid",
      "title": "Lesson 1"
    }
  }
}
```

**Error Responses:**

| Status | Condition |
| ------ | --------- |
| 400 | Missing `videoId` |
| 400 | Asset is not a video |
| 404 | Video not found |

---

## Student / Admin Playback

> [!NOTE]
> This endpoint requires authentication and allows `student` and `admin` roles.

### 6. Get Lesson Video Stream URL

**`GET /drive/stream/:videoId`**

Returns a signed Bunny HLS URL for a ready video.

**URL Parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `videoId` | string | Local asset UUID or Bunny video GUID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "video": {
      "id": "asset-uuid",
      "title": "Lesson 1",
      "streamUrl": "https://pull-zone.example.com/bunny-guid/playlist.m3u8?token=..."
    }
  }
}
```

**Error Responses:**

| Status | Condition |
| ------ | --------- |
| 401 | Not authenticated |
| 400 | Missing `videoId` |
| 400 | Asset is not a video |
| 400 | Missing Bunny GUID |
| 400 | Video failed processing |
| 400 | Video is not ready yet |
| 404 | Video not found |

> [!IMPORTANT]
> Lesson access authorization is not yet implemented in the controller. The endpoint currently validates authentication and video readiness only.

---

## Public Webhook

### 7. Bunny Webhook

**`POST /drive/webhook/bunny?secret=YOUR_SECRET`**

Receives Bunny Stream encoding status updates and updates local asset status.

**Query Parameters:**

| Param | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `secret` | string | ✅ | Must match `BUNNY_WEBHOOK_SECRET` |

**Request Body Example:**

```json
{
  "VideoLibraryId": 613395,
  "VideoGuid": "bunny-video-guid",
  "Status": 3
}
```

**Status Mapping:**

| Bunny Status | Local Status |
| ------------ | ------------ |
| `3` | `ready` |
| `5` | `failed` |
| any other status | `processing` |

**Success Response (200):**

```text
Webhook received
```

**Validation Rules:**

- if the `secret` is wrong or missing, the endpoint returns `200 OK` with `OK`
- `VideoLibraryId` must match `BUNNY_LIBRARY_ID`
- `VideoGuid` and `Status` must be present



## Current Route Summary

| Method | Path | Access |
| ------ | ---- | ------ |
| POST | `/drive/auth/login` | Public |
| POST | `/drive/upload/init` | Super admin |
| GET | `/drive/folders/:folderId?` | Super admin |
| POST | `/drive/folders` | Super admin |
| DELETE | `/drive/files/:videoId` | Super admin |
| GET | `/drive/stream/:videoId` | Student or Admin |
| POST | `/drive/webhook/bunny` | Public (protected by query secret) |
