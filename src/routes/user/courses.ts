import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getAllCourses, getCourseById, getPurchasedCourses } from "../../controllers/user/courses";
import { authorizeRoles } from "../../middlewares/authorized";

const router = Router();

router.get("/", catchAsync(getAllCourses));
router.get("/purchased", catchAsync(getPurchasedCourses));
router.get("/:id", catchAsync(getCourseById));

export default router;