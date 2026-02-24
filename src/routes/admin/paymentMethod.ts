import { Router } from "express";
import {
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    getAllPaymentMethods,
    getPaymentMethodById,
    getSelectionCurrency
} from "../../controllers/admin/paymentMethod";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();
// No Authorization for this
router.get("/selectionCurrency", catchAsync(getSelectionCurrency));
//--------------------

router.post("/", catchAsync(createPaymentMethod));
router.get("/", catchAsync(getAllPaymentMethods));
router.get("/:id", catchAsync(getPaymentMethodById));
router.put("/:id", catchAsync(updatePaymentMethod));
router.delete("/:id", catchAsync(deletePaymentMethod));

export default router;
