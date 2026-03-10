"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const payment_1 = require("../../controllers/admin/payment");
const router = (0, express_1.Router)();
router.get("/recharge-requests", (0, catchAsync_1.catchAsync)(payment_1.getRechargeRequests));
router.post("/recharge/:id/reply", (0, catchAsync_1.catchAsync)(payment_1.replyToRechargeRequest));
exports.default = router;
