// ─────────────────────────────────────────────────────────────────
// 📦 MODULES — Every resource that can be permission-guarded
// Adding a new route? Add its module name here first.
// ─────────────────────────────────────────────────────────────────
export const MODULES = [
    // ── Admin management ──────────────────────────────────────────
    "admins",
    "roles",

    // ── Academic content ──────────────────────────────────────────
    "categories",
    "courses",
    "chapters",
    "lessons",
    "sections",
    "semesters",
    "grades",

    // ── Assessment ────────────────────────────────────────────────
    "questions",
    "exams",
    "quizzes",
    "diagnostic_exams",
    "raw_scores",
    "exam_codes",

    // ── Users ─────────────────────────────────────────────────────
    "students",
    "teachers",
    "parents",

    // ── Classes & scheduling ──────────────────────────────────────
    "groups",
    "sessions",
    "session_ratings",

    // ── Commerce ──────────────────────────────────────────────────
    "packages",
    "payments",
    "payment_methods",
    "promo_codes",
    "currencies",

    // ── Communication & CMS ───────────────────────────────────────
    "notifications",
    "popups",
    "reports",
] as const;

// ─────────────────────────────────────────────────────────────────
// ⚡ ACTIONS — What can be done on any module
// ─────────────────────────────────────────────────────────────────
export const ACTION_NAMES = ["View", "Add", "Edit", "Delete", "Status"] as const;

// ─────────────────────────────────────────────────────────────────
// 🏷️  Derived Types
// ─────────────────────────────────────────────────────────────────
export type ModuleName = (typeof MODULES)[number];
export type ActionName = (typeof ACTION_NAMES)[number];

// Utility: human-readable label for a module key (e.g. "promo_codes" → "Promo Codes")
export const formatModuleLabel = (module: string): string =>
    module
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

// Utility: human-readable label for an action key (e.g. "Add" → "Add")
export const formatActionLabel = (action: string): string =>
    action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();

export const BASE64_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;

