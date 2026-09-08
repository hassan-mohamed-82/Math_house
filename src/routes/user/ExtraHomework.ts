import { Router } from "express";
import {
    getMyExtraHomework,
    getExtraHomeworkDetail,
    submitExtraHomework,
} from "../../controllers/user/ExtraHomework";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { submitExtraHomeworkSchema } from "../../validation/user/extraHomework";

const router = Router();

// GET /api/user/extra-homework         — list assigned extra homework
router.get("/", catchAsync(getMyExtraHomework));

// GET /api/user/extra-homework/:id     — get assignment details
router.get("/:id", catchAsync(getExtraHomeworkDetail));

// POST /api/user/extra-homework/:id/submit — submit solved PDF
router.post("/:id/submit", validate(submitExtraHomeworkSchema), catchAsync(submitExtraHomework));

export default router;
