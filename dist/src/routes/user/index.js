"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const studentauth_1 = __importDefault(require("./studentauth"));
const profile_1 = __importDefault(require("./profile"));
const wallet_1 = __importDefault(require("./wallet"));
const authorized_1 = require("../../middlewares/authorized");
const authenticated_1 = require("../../middlewares/authenticated");
const router = (0, express_1.Router)();
router.use("/auth", studentauth_1.default);
router.use(authenticated_1.authenticated, (0, authorized_1.authorizeRoles)("student", "parent", "teacher", "admin"));
router.use("/profile", profile_1.default);
router.use("/wallet", wallet_1.default);
exports.default = router;
