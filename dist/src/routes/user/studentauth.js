"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = require("../../utils/catchAsync");
const studentauth_1 = require("../../controllers/user/studentauth");
const studentauth_2 = require("../../controllers/user/studentauth");
const router = express_1.default.Router();
router.post("/signup", (0, catchAsync_1.catchAsync)(studentauth_1.studentSignup));
router.post("/login", (0, catchAsync_1.catchAsync)(studentauth_1.studentLogin));
router.get("/select", (0, catchAsync_1.catchAsync)(studentauth_2.selectcategoryandgrade));
exports.default = router;
