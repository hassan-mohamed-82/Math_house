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
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();
router.get("/selectionCurrency", requirePermission("payment_methods", "View"), catchAsync(getSelectionCurrency));

router.post("/", requirePermission("payment_methods", "Add"), catchAsync(createPaymentMethod));
router.get("/", requirePermission("payment_methods", "View"), catchAsync(getAllPaymentMethods));
router.get("/:id", requirePermission("payment_methods", "View"), catchAsync(getPaymentMethodById));
router.put("/:id", requirePermission("payment_methods", "Edit"), catchAsync(updatePaymentMethod));
router.delete("/:id", requirePermission("payment_methods", "Delete"), catchAsync(deletePaymentMethod));

export default router;
