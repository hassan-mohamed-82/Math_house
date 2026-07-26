import { Router } from "express";
import { getAvailablePromoCodes, checkPromoCode } from "../../controllers/user/promoCodes";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(getAvailablePromoCodes));
router.post("/validate", catchAsync(checkPromoCode));

export default router;
