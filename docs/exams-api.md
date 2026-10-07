# Exams API - Reusable Session PDFs

Base URL: `/admin/exams`

Static exam create and update requests accept the following optional fields:

| Field | Type | Description |
| --- | --- | --- |
| `session_pdf` | string or null | Reusable session worksheet, supplied as a URL or base64-encoded PDF. |
| `session_answers_pdf` | string or null | Reusable teacher-only answer PDF, supplied as a URL or base64-encoded PDF. |

The fields are returned by the admin exam list, course exam list, and exam detail endpoints. In `PUT /admin/exams/:id`, omit a field to leave it unchanged or pass `null` to clear it.
