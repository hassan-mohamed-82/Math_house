import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeRoles } from "../../middlewares/authorized";
import { getDashboardData } from "../../controllers/user/dashboard";
const router = Router();

router.use(authorizeRoles("student"));
router.get("/dashboard", catchAsync(getDashboardData));

export default router;