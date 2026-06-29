import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getAllCalculators } from "../../controllers/admin/generalSelection";

const router = Router();

router.get("/calculators", catchAsync(getAllCalculators));

export default router;