import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeRoles } from "../../middlewares/authorized";
import { getStudentNotes } from "../../controllers/user/notes";

const router = Router();

router.use(authorizeRoles("student"));

// GET /user/notes
router.get("/", catchAsync(getStudentNotes));
export default router;
