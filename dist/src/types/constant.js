"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE64_PDF_REGEX = exports.BASE64_IMAGE_REGEX = exports.formatActionLabel = exports.formatModuleLabel = exports.ACTION_NAMES = exports.MODULES = void 0;
// ─────────────────────────────────────────────────────────────────
// 📦 MODULES — Every resource that can be permission-guarded
// Adding a new route? Add its module name here first.
// ─────────────────────────────────────────────────────────────────
exports.MODULES = [
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
];
// ─────────────────────────────────────────────────────────────────
// ⚡ ACTIONS — What can be done on any module
// ─────────────────────────────────────────────────────────────────
exports.ACTION_NAMES = ["View", "Add", "Edit", "Delete", "Status"];
// Utility: human-readable label for a module key (e.g. "promo_codes" → "Promo Codes")
const formatModuleLabel = (module) => module
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
exports.formatModuleLabel = formatModuleLabel;
// Utility: human-readable label for an action key (e.g. "Add" → "Add")
const formatActionLabel = (action) => action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
exports.formatActionLabel = formatActionLabel;
exports.BASE64_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
exports.BASE64_PDF_REGEX = /^data:application\/pdf;base64,/;
