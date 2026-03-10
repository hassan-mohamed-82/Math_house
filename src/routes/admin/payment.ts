import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { replyToRechargeRequest, getRechargeRequests } from "../../controllers/admin/payment";
const router = Router();

router.get("/recharge-requests", catchAsync(getRechargeRequests));
router.post("/recharge/:id/reply", catchAsync(replyToRechargeRequest));

export default router;