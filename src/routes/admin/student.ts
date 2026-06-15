import { Router } from "express";
import {
    createStudent, deleteStudent, getAllStudents,
    getStudentById, updateStudent, selection, openStudentAccount, topUpWallet, getPaymentHistory,
    getStudentContent, attendItems, getStudentPackages, purchasePackageForStudent
} from "../../controllers/admin/student";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { studentSchema, updateStudentSchema, idParamsSchema } from "../../validation/admin/student";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// ── Selection helpers (open to any authenticated admin) ──────────────────
router.get("/select", catchAsync(selection));

// ── List & detail ─────────────────────────────────────────────────────────
router.get("/",    requirePermission("students", "View"), catchAsync(getAllStudents));
router.get("/:id", validate(idParamsSchema, "params"), requirePermission("students", "View"), catchAsync(getStudentById));
router.get("/:id/open-account",    validate(idParamsSchema, "params"), requirePermission("students", "View"),  catchAsync(openStudentAccount));
router.get("/:id/payment-history", validate(idParamsSchema, "params"), requirePermission("students", "View"),  catchAsync(getPaymentHistory));
router.get("/:id/content",         validate(idParamsSchema, "params"), requirePermission("students", "View"),  catchAsync(getStudentContent));
router.get("/:id/packages",        validate(idParamsSchema, "params"), requirePermission("students", "View"),  catchAsync(getStudentPackages));

// ── Create ────────────────────────────────────────────────────────────────
router.post("/", validate(studentSchema), requirePermission("students", "Add"), catchAsync(createStudent));

// ── Update ────────────────────────────────────────────────────────────────
router.put("/:id",           validate(updateStudentSchema), requirePermission("students", "Edit"),  catchAsync(updateStudent));
router.post("/:id/top-up-wallet", validate(idParamsSchema, "params"), requirePermission("students", "Edit"), catchAsync(topUpWallet));
router.post("/:id/enroll",        validate(idParamsSchema, "params"), requirePermission("students", "Edit"), catchAsync(attendItems));
router.post("/:id/packages",      validate(idParamsSchema, "params"), requirePermission("students", "Edit"), catchAsync(purchasePackageForStudent));

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id", validate(idParamsSchema, "params"), requirePermission("students", "Delete"), catchAsync(deleteStudent));

export default router;