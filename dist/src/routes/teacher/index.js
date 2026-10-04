"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticated_1 = require("../../middlewares/authenticated");
const authorized_1 = require("../../middlewares/authorized");
const auth_1 = __importDefault(require("./auth"));
const sessions_1 = __importDefault(require("./sessions"));
const router = (0, express_1.Router)();
// Public auth routes (login)
router.use("/auth", auth_1.default);
// All sessions routes require authentication as teacher
router.use(authenticated_1.authenticated, (0, authorized_1.authorizeRoles)("teacher"));
router.use("/profile", auth_1.default);
router.use("/sessions", sessions_1.default);
exports.default = router;
