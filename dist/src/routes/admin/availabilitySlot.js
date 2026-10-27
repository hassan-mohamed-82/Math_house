"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const availabilitySlot_1 = require("../../controllers/admin/availabilitySlot");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const requirePermission_1 = require("../../middlewares/requirePermission");
const availabilitySlot_2 = require("../../validation/admin/availabilitySlot");
const router = (0, express_1.Router)();
const requireSlotPermission = (action) => {
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
router.get("/", requireSlotPermission("View"), (0, catchAsync_1.catchAsync)(availabilitySlot_1.getAdminAvailabilitySlots));
router.post("/", requireSlotPermission("Add"), (0, validation_1.validate)(availabilitySlot_2.createAdminSlotSchema), (0, catchAsync_1.catchAsync)(availabilitySlot_1.createAdminAvailabilitySlot));
router.get("/:id", requireSlotPermission("View"), (0, catchAsync_1.catchAsync)(availabilitySlot_1.getAdminAvailabilitySlotById));
router.put("/:id", requireSlotPermission("Edit"), (0, validation_1.validate)(availabilitySlot_2.updateAdminSlotSchema), (0, catchAsync_1.catchAsync)(availabilitySlot_1.updateAdminAvailabilitySlot));
router.put("/:id/status", requireSlotPermission("Edit"), (0, validation_1.validate)(availabilitySlot_2.updateAdminSlotStatusSchema), (0, catchAsync_1.catchAsync)(availabilitySlot_1.updateAdminSlotStatus));
router.delete("/:id", requireSlotPermission("Delete"), (0, catchAsync_1.catchAsync)(availabilitySlot_1.deleteAdminAvailabilitySlot));
exports.default = router;
