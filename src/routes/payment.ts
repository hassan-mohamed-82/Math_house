import { Router } from "express";
import { handlePaymobCallback } from "../controllers/user/wallet";
import { catchAsync } from "../utils/catchAsync";

const router = Router();

router.get("/paymob/callback", catchAsync(handlePaymobCallback));
router.post("/paymob/callback", catchAsync(handlePaymobCallback));

export default router;
