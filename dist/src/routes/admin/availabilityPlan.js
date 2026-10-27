"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const availabilityPlan_1 = require("../../controllers/admin/availabilityPlan");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const requirePermission_1 = require("../../middlewares/requirePermission");
const availabilityPlan_2 = require("../../validation/admin/availabilityPlan");
const availabilitySlot_1 = __importDefault(require("./availabilitySlot"));
const router = (0, express_1.Router)();
// Availability slots management (nested under availability-plans/slots)
router.use("/slots", availabilitySlot_1.default);
/**
 * Flexible permission middleware that checks for 'availability_plans' permission,
 * and seamlessly falls back to 'sessions' permission for existing roles.
 */
const requirePlanPermission = (action) => {
    return async (req, res, next) => {
        const checkAvailability = (0, requirePermission_1.requirePermission)("availability_plans", action);
        checkAvailability(req, res, (err) => {
            if (!err)
                return next();
            const checkSessions = (0, requirePermission_1.requirePermission)("sessions", action);
            return checkSessions(req, res, next);
        });
    };
};
router.get("/", requirePlanPermission("View"), (0, catchAsync_1.catchAsync)(availabilityPlan_1.getAllAvailabilityPlans));
router.get("/:id", requirePlanPermission("View"), (0, catchAsync_1.catchAsync)(availabilityPlan_1.getAvailabilityPlanById));
router.get("/:id/matching-sessions", requirePlanPermission("View"), (0, catchAsync_1.catchAsync)(availabilityPlan_1.getMatchingSessionsForPlan));
router.post("/:id/propose-sessions", requirePlanPermission("Edit"), (0, validation_1.validate)(availabilityPlan_2.proposeSessionsSchema), (0, catchAsync_1.catchAsync)(availabilityPlan_1.proposeSessionsForPlan));
router.put("/:id/status", requirePlanPermission("Edit"), (0, validation_1.validate)(availabilityPlan_2.updatePlanStatusSchema), (0, catchAsync_1.catchAsync)(availabilityPlan_1.updatePlanStatus));
router.delete("/:id", requirePlanPermission("Delete"), (0, catchAsync_1.catchAsync)(availabilityPlan_1.deleteAvailabilityPlan));
exports.default = router;
