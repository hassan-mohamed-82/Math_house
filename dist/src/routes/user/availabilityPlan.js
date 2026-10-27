"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const availabilityPlan_1 = require("../../controllers/user/availabilityPlan");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const availabilityPlan_2 = require("../../validation/user/availabilityPlan");
const router = (0, express_1.Router)();
// Student Availability Plans routes
router.get("/slots", (0, catchAsync_1.catchAsync)(availabilityPlan_1.getAvailableSlots));
router.post("/", (0, validation_1.validate)(availabilityPlan_2.createAvailabilityPlanSchema), (0, catchAsync_1.catchAsync)(availabilityPlan_1.createAvailabilityPlan));
router.get("/", (0, catchAsync_1.catchAsync)(availabilityPlan_1.getMyAvailabilityPlans));
router.get("/:id", (0, catchAsync_1.catchAsync)(availabilityPlan_1.getMyAvailabilityPlanById));
router.put("/:id", (0, validation_1.validate)(availabilityPlan_2.updateAvailabilityPlanSchema), (0, catchAsync_1.catchAsync)(availabilityPlan_1.updateAvailabilityPlan));
router.post("/:id/respond", (0, validation_1.validate)(availabilityPlan_2.respondToPlanSchema), (0, catchAsync_1.catchAsync)(availabilityPlan_1.respondToProposedPlan));
router.post("/:id/cancel", (0, catchAsync_1.catchAsync)(availabilityPlan_1.cancelAvailabilityPlan));
exports.default = router;
