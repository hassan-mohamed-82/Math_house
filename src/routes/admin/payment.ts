import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
    replyToRechargeRequest,
    getRechargeRequests,
    getPackageBuyRequests,
    replytoPackageBuyRequest as replyToPackageBuyRequest,
    getContentBuyRequests,
    replyToContentBuyRequest
 } from "../../controllers/admin/payment";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.get("/recharge-requests", requirePermission("payments", "View"), catchAsync(getRechargeRequests));
router.post("/recharge-requests/:paymentId/reply", requirePermission("payments", "Edit"), catchAsync(replyToRechargeRequest));
router.get("/package-buy-requests", requirePermission("payments", "View"), catchAsync(getPackageBuyRequests));
router.post("/package-buy-requests/:paymentId/reply", requirePermission("payments", "Edit"), catchAsync(replyToPackageBuyRequest));
router.get("/content-buy-requests", requirePermission("payments", "View"), catchAsync(getContentBuyRequests));
router.post("/content-buy-requests/:paymentId/reply", requirePermission("payments", "Edit"), catchAsync(replyToContentBuyRequest));

export default router;