"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = require("../../utils/catchAsync");
const studentauth_1 = require("../../controllers/user/studentauth");
const router = express_1.default.Router();
router.post("/signup", (0, catchAsync_1.catchAsync)(studentauth_1.studentSignup));
router.post("/login", (0, catchAsync_1.catchAsync)(studentauth_1.studentLogin));
router.post("/forgot-password", (0, catchAsync_1.catchAsync)(studentauth_1.forgetPassword));
router.post("/validate-reset-code", (0, catchAsync_1.catchAsync)(studentauth_1.validatePasswordResetCode));
router.post("/reset-password", (0, catchAsync_1.catchAsync)(studentauth_1.resetPassword));
router.get("/verify-email", (0, catchAsync_1.catchAsync)(studentauth_1.verifyStudentEmail));
router.get("/select", (0, catchAsync_1.catchAsync)(studentauth_1.selectcategoryandgrade));
exports.default = router;
