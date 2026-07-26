"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promoCodes_1 = require("../../controllers/user/promoCodes");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/", (0, catchAsync_1.catchAsync)(promoCodes_1.getAvailablePromoCodes));
router.post("/validate", (0, catchAsync_1.catchAsync)(promoCodes_1.checkPromoCode));
exports.default = router;
