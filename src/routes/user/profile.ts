import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizeRoles } from "../../middlewares/authorized";
import { changeMyPassword, getMyProfile, updateMyProfile } from "../../controllers/user/profile";

const router = Router();

router.use(authorizeRoles("student"));

router.get("/", catchAsync(getMyProfile));
router.put("/", catchAsync(updateMyProfile));
router.put("/change-password", catchAsync(changeMyPassword));

export default router;