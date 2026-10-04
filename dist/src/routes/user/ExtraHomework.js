"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExtraHomework_1 = require("../../controllers/user/ExtraHomework");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const extraHomework_1 = require("../../validation/user/extraHomework");
const router = (0, express_1.Router)();
// GET /api/user/extra-homework         — list assigned extra homework
router.get("/", (0, catchAsync_1.catchAsync)(ExtraHomework_1.getMyExtraHomework));
// GET /api/user/extra-homework/:id     — get assignment details
router.get("/:id", (0, catchAsync_1.catchAsync)(ExtraHomework_1.getExtraHomeworkDetail));
// POST /api/user/extra-homework/:id/submit — submit solved PDF
router.post("/:id/submit", (0, validation_1.validate)(extraHomework_1.submitExtraHomeworkSchema), (0, catchAsync_1.catchAsync)(ExtraHomework_1.submitExtraHomework));
exports.default = router;
