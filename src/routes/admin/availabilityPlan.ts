import { Router, RequestHandler } from "express";
import {
    getAllAvailabilityPlans,
    getAvailabilityPlanById,
    getMatchingSessionsForPlan,
    proposeSessionsForPlan,
    updatePlanStatus,
    deleteAvailabilityPlan,
} from "../../controllers/admin/availabilityPlan";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { requirePermission } from "../../middlewares/requirePermission";
import {
    proposeSessionsSchema,
    updatePlanStatusSchema,
} from "../../validation/admin/availabilityPlan";
import { ActionName } from "../../types/constant";

const router = Router();

/**
 * Flexible permission middleware that checks for 'availability_plans' permission,
 * and seamlessly falls back to 'sessions' permission for existing roles.
 */
const requirePlanPermission = (action: ActionName): RequestHandler => {
    return async (req, res, next) => {
        const checkAvailability = requirePermission("availability_plans", action);
        checkAvailability(req, res, (err?: any) => {
            if (!err) return next();
            const checkSessions = requirePermission("sessions", action);
            return checkSessions(req, res, next);
        });
    };
};

router.get("/", requirePlanPermission("View"), catchAsync(getAllAvailabilityPlans));
router.get("/:id", requirePlanPermission("View"), catchAsync(getAvailabilityPlanById));
router.get("/:id/matching-sessions", requirePlanPermission("View"), catchAsync(getMatchingSessionsForPlan));
router.post("/:id/propose-sessions", requirePlanPermission("Edit"), validate(proposeSessionsSchema), catchAsync(proposeSessionsForPlan));
router.put("/:id/status", requirePlanPermission("Edit"), validate(updatePlanStatusSchema), catchAsync(updatePlanStatus));
router.delete("/:id", requirePlanPermission("Delete"), catchAsync(deleteAvailabilityPlan));

export default router;
