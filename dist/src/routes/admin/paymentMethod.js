"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentMethod_1 = require("../../controllers/admin/paymentMethod");
const catchAsync_1 = require("../../utils/catchAsync");
const requirePermission_1 = require("../../middlewares/requirePermission");
const router = (0, express_1.Router)();
// No Authorization for this
router.get("/selectionCurrency", (0, catchAsync_1.catchAsync)(paymentMethod_1.getSelectionCurrency));
//--------------------
router.post("/", (0, requirePermission_1.requirePermission)("payment_methods", "Add"), (0, catchAsync_1.catchAsync)(paymentMethod_1.createPaymentMethod));
router.get("/", (0, requirePermission_1.requirePermission)("payment_methods", "View"), (0, catchAsync_1.catchAsync)(paymentMethod_1.getAllPaymentMethods));
router.get("/:id", (0, requirePermission_1.requirePermission)("payment_methods", "View"), (0, catchAsync_1.catchAsync)(paymentMethod_1.getPaymentMethodById));
router.put("/:id", (0, requirePermission_1.requirePermission)("payment_methods", "Edit"), (0, catchAsync_1.catchAsync)(paymentMethod_1.updatePaymentMethod));
router.delete("/:id", (0, requirePermission_1.requirePermission)("payment_methods", "Delete"), (0, catchAsync_1.catchAsync)(paymentMethod_1.deletePaymentMethod));
exports.default = router;
