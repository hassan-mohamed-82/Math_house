import{Router} from "express";
import{createTeacher,getTeacherById,getAllTeachers,updateTeacher,deleteTeacher} from "../../controllers/admin/teacher";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/",  catchAsync(createTeacher));
router.get("/:id", catchAsync(getTeacherById));
router.get("/", catchAsync(getAllTeachers));
router.put("/:id", catchAsync(updateTeacher));
router.delete("/:id", catchAsync(deleteTeacher));

export default router;