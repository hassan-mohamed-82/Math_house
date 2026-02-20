import { Router } from "express";
import {
    createStudent, deleteStudent, getAllStudents,
    getStudentById, updateStudent, selection, openStudentAccount, topUpWallet, getPaymentHistory
} from "../../controllers/admin/student";
import {
    catchAsync
} from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { studentSchema, updateStudentSchema, idParamsSchema } from "../../validation/admin/student";
const router = Router();

router.get("/select", catchAsync(selection));

router.post("/", validate(studentSchema), catchAsync(createStudent));
router.get("/", catchAsync(getAllStudents));
router.get("/:id", validate(idParamsSchema, "params"), catchAsync(getStudentById));
router.put("/:id", validate(updateStudentSchema), catchAsync(updateStudent));
router.delete("/:id", validate(idParamsSchema, "params"), catchAsync(deleteStudent));
// router.get("/category/:categoryId", catchAsync(getStudentsByCategory));
// router.get("/grade/:grade", catchAsync(getStudentsByGrade));

router.get("/:id/open-account", validate(idParamsSchema, "params"), catchAsync(openStudentAccount));
router.post("/:id/top-up-wallet", validate(idParamsSchema, "params"), catchAsync(topUpWallet));
router.get("/:id/payment-history", validate(idParamsSchema, "params"), catchAsync(getPaymentHistory));

export default router;