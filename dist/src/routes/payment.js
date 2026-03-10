"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_1 = require("../controllers/user/wallet");
const catchAsync_1 = require("../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/paymob/callback", (0, catchAsync_1.catchAsync)(wallet_1.handlePaymobCallback));
router.post("/paymob/callback", (0, catchAsync_1.catchAsync)(wallet_1.handlePaymobCallback));
exports.default = router;
