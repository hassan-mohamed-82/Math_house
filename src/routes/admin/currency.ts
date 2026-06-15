import { Router } from "express";
import {
    createCurrency,
    updateCurrency,
    deleteCurrency,
    getAllCurrencies,
    getCurrencyById,
    setBaseCurrency,
    fetchLiveRates,
    convert,
} from "../../controllers/admin/currency";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", requirePermission("currencies", "Add"), catchAsync(createCurrency));
router.get("/", requirePermission("currencies", "View"), catchAsync(getAllCurrencies));
router.get("/rates/live", requirePermission("currencies", "View"), catchAsync(fetchLiveRates));
router.post("/convert", requirePermission("currencies", "View"), catchAsync(convert));
router.put("/base/:id", requirePermission("currencies", "Edit"), catchAsync(setBaseCurrency));
router.put("/:id", requirePermission("currencies", "Edit"), catchAsync(updateCurrency));
router.delete("/:id", requirePermission("currencies", "Delete"), catchAsync(deleteCurrency));
router.get("/:id", requirePermission("currencies", "View"), catchAsync(getCurrencyById));

export default router;
