import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    replyToRechargeRequest,
    getRechargeRequests,
    getPackageBuyRequests,
    replytoPackageBuyRequest as replyToPackageBuyRequest
 } from "../../controllers/admin/payment";
const router = Router();

router.get("/recharge-requests", catchAsync(getRechargeRequests));
router.post("/recharge-requests/:paymentId/reply", catchAsync(replyToRechargeRequest));
router.get("/package-buy-requests", catchAsync(getPackageBuyRequests));
router.post("/package-buy-requests/:paymentId/reply", catchAsync(replyToPackageBuyRequest));

export default router;