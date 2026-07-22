import { Router } from "express";
import {
    createPromoCode,
    currencySelection,
    deletePromoCode,
    getAllPromoCodes,
    getPromoCodebyId,
    updatePromoCode
} from "../../controllers/admin/promoCodes";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.get("/currency", catchAsync(currencySelection));
router.post("/", requirePermission("promo_codes", "Add"), catchAsync(createPromoCode));
router.get("/", requirePermission("promo_codes", "View"), catchAsync(getAllPromoCodes));
router.get("/:id", requirePermission("promo_codes", "View"), catchAsync(getPromoCodebyId));
router.put("/:id", requirePermission("promo_codes", "Edit"), catchAsync(updatePromoCode));  
router.delete("/:id", requirePermission("promo_codes", "Delete"), catchAsync(deletePromoCode));


export default router;