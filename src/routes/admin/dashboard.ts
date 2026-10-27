import { Router } from "express";
import { getDashboard } from "../../controllers/admin/dashboard";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// GET /admin/dashboard
// Query params:
//   - filter: "7_days" | "last_7_days" | "this_month" | "custom" (default: "last_7_days")
//   - startDate: "YYYY-MM-DD" (required when filter="custom")
//   - endDate: "YYYY-MM-DD"   (required when filter="custom")
router.get("/", catchAsync(getDashboard));

export default router;
