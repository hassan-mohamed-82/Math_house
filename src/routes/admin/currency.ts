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

const router = Router();

router.post("/", catchAsync(createCurrency));
router.get("/", catchAsync(getAllCurrencies));
router.get("/rates/live", catchAsync(fetchLiveRates));
router.post("/convert", catchAsync(convert));
router.put("/base/:id", catchAsync(setBaseCurrency));
router.put("/:id", catchAsync(updateCurrency));
router.delete("/:id", catchAsync(deleteCurrency));
router.get("/:id", catchAsync(getCurrencyById));

export default router;
