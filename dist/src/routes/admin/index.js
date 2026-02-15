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
const courses_1 = __importDefault(require("./courses"));
const semester_1 = __importDefault(require("./semester"));
const chapters_1 = __importDefault(require("./chapters"));
const lessons_1 = __importDefault(require("./lessons"));
const questions_1 = __importDefault(require("./questions"));
const examCodes_1 = __importDefault(require("./examCodes"));
const admin_1 = __importDefault(require("./admin"));
const authenticated_1 = require("../../middlewares/authenticated");
const authorized_1 = require("../../middlewares/authorized");
const auth_1 = __importDefault(require("./auth"));
const router = (0, express_1.Router)();
router.use("/auth", auth_1.default);
router.use(authenticated_1.authenticated, (0, authorized_1.authorizeRoles)("admin", "teacher"));
// router.use("/", adminRouter)
router.use("/category", category_1.default);
router.use("/roles", roles_1.default);
router.use("/student", student_1.default);
router.use("/parent", parent_1.default);
router.use("/admin", admin_1.default);
router.use("/teacher", teacher_1.default);
router.use("/courses", courses_1.default);
router.use("/semester", semester_1.default);
router.use("/chapters", chapters_1.default);
router.use("/lessons", lessons_1.default);
router.use("/questions", questions_1.default);
router.use("/examCodes", examCodes_1.default);
exports.default = router;
