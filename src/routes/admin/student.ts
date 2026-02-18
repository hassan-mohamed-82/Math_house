import { Router } from "express";
import { createStudent, deleteStudent, getAllStudents,
     getStudentById, updateStudent,selection,openStudentAccount,topUpWallet,getPaymentHistory} from "../../controllers/admin/student";
import {
    catchAsync
} from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import {studentSchema,updateStudentSchema,idSchema} from "../../validation/admin/student";
const router = Router();

router.get("/select", catchAsync(selection));

router.post("/", validate(studentSchema), catchAsync(createStudent));
router.get("/", catchAsync(getAllStudents));
router.get("/:id", validate(idSchema), catchAsync(getStudentById));
router.put("/:id", validate(updateStudentSchema), catchAsync(updateStudent));
router.delete("/:id", validate(idSchema), catchAsync(deleteStudent));
// router.get("/category/:categoryId", catchAsync(getStudentsByCategory));
// router.get("/grade/:grade", catchAsync(getStudentsByGrade));

router.get("/:id/open-account", validate(idSchema), catchAsync(openStudentAccount));
router.post("/:id/top-up-wallet", validate(idSchema), catchAsync(topUpWallet));
router.get("/:id/payment-history", validate(idSchema), catchAsync(getPaymentHistory));

export default router;