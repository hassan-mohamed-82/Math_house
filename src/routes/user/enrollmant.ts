import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { enrollInCourse, getEnrolledCourseById, getMyPurchases } from "../../controllers/user/enrollmant";


const router = Router();
router.post("/enroll", catchAsync(enrollInCourse));
router.get("/my-purchases", catchAsync(getMyPurchases));
router.get("/:id", catchAsync(getEnrolledCourseById));

export default router;

