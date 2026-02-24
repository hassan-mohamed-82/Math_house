import { Router } from "express";
import {
    createPromoCode,
    deletePromoCode,
    getAllPromoCodes,
    getPromocodesbyId,
    updatePromoCode
} from "../../controllers/admin/promoCodes";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createPromoCode));
router.get("/", catchAsync(getAllPromoCodes));
router.get("/:id", catchAsync(getPromocodesbyId));
router.put("/:id", catchAsync(updatePromoCode));
router.delete("/:id", catchAsync(deletePromoCode));

export default router;