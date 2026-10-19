import { Router, RequestHandler } from "express";
import {
    getAdminAvailabilitySlots,
    getAdminAvailabilitySlotById,
    createAdminAvailabilitySlot,
    updateAdminAvailabilitySlot,
    updateAdminSlotStatus,
    deleteAdminAvailabilitySlot,
} from "../../controllers/admin/availabilitySlot";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { requirePermission } from "../../middlewares/requirePermission";
import {
    createAdminSlotSchema,
    updateAdminSlotSchema,
    updateAdminSlotStatusSchema,
} from "../../validation/admin/availabilitySlot";
import { ActionName } from "../../types/constant";

const router = Router();

const requireSlotPermission = (action: ActionName): RequestHandler => {
    return async (req, res, next) => {
        const checkAvailability = requirePermission("availability_plans", action);
        checkAvailability(req, res, (err?: any) => {
            if (!err) return next();
            const checkSessions = requirePermission("sessions", action);
            return checkSessions(req, res, next);
        });
    };
};

router.get("/", requireSlotPermission("View"), catchAsync(getAdminAvailabilitySlots));
router.post("/", requireSlotPermission("Add"), validate(createAdminSlotSchema), catchAsync(createAdminAvailabilitySlot));
router.get("/:id", requireSlotPermission("View"), catchAsync(getAdminAvailabilitySlotById));
router.put("/:id", requireSlotPermission("Edit"), validate(updateAdminSlotSchema), catchAsync(updateAdminAvailabilitySlot));
router.put("/:id/status", requireSlotPermission("Edit"), validate(updateAdminSlotStatusSchema), catchAsync(updateAdminSlotStatus));
router.delete("/:id", requireSlotPermission("Delete"), catchAsync(deleteAdminAvailabilitySlot));

export default router;
