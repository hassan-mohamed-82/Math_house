"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import authRouter from "./auth"
// import adminRouter from "./admin"
const roles_1 = __importDefault(require("./roles"));
const student_1 = __importDefault(require("./student"));
const parent_1 = __importDefault(require("./parent"));
const category_1 = __importDefault(require("./category"));
const teacher_1 = __importDefault(require("./teacher"));
const router = (0, express_1.Router)();
// router.use("/auth", authRouter)
router.use("/category", category_1.default);
// router.use(authenticated, authorizeRoles("admin", "teacher"))
// router.use("/", adminRouter)
router.use("/roles", roles_1.default);
router.use("/student", student_1.default);
router.use("/parent", parent_1.default);
router.use("/teacher", teacher_1.default);
exports.default = router;
