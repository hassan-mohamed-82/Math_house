"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import authRouter from "./auth"
// import adminRouter from "./admin"
const roles_1 = __importDefault(require("./roles"));
const category_1 = __importDefault(require("./category"));
const authenticated_1 = require("../../middlewares/authenticated");
const authorized_1 = require("../../middlewares/authorized");
const router = (0, express_1.Router)();
// router.use("/auth", authRouter)
router.use(authenticated_1.authenticated, (0, authorized_1.authorizeRoles)("admin", "teacher"));
// router.use("/", adminRouter)
router.use("/roles", roles_1.default);
router.use("/category", category_1.default);
exports.default = router;
