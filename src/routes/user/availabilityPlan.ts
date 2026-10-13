import { Router } from "express";
import {
    createAvailabilityPlan,
    getMyAvailabilityPlans,
    getMyAvailabilityPlanById,
    respondToProposedPlan,
    cancelAvailabilityPlan,
} from "../../controllers/user/availabilityPlan";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import {
    createAvailabilityPlanSchema,
    respondToPlanSchema,
} from "../../validation/user/availabilityPlan";

const router = Router();

// Student Availability Plans routes
router.post("/", validate(createAvailabilityPlanSchema), catchAsync(createAvailabilityPlan));
router.get("/", catchAsync(getMyAvailabilityPlans));
router.get("/:id", catchAsync(getMyAvailabilityPlanById));
router.post("/:id/respond", validate(respondToPlanSchema), catchAsync(respondToProposedPlan));
router.post("/:id/cancel", catchAsync(cancelAvailabilityPlan));

export default router;
