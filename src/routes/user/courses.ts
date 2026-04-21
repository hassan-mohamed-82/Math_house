import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeRoles } from "../../middlewares/authorized";
import { getAllCourses, getCourseById, enrollInCourse, getEnrolledCourseById, getMyPurchases } from "../../controllers/user/courses";

const router = Router();

router.get("/", catchAsync(getAllCourses));
router.get("/my-purchases", catchAsync(getMyPurchases));

router.get("/:id", catchAsync(getCourseById));
router.post("/enroll", catchAsync(enrollInCourse));
router.get("/enrolled/:id", catchAsync(getEnrolledCourseById));

export default router;