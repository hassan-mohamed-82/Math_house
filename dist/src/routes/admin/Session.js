"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Session_1 = require("../../controllers/admin/Session");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// Select dropdowns
router.get("/select", (0, catchAsync_1.catchAsync)(Session_1.selectOptions));
// Users
router.get("/:groupId", (0, catchAsync_1.catchAsync)(Session_1.getGroupUsers));
router.get("/search-users", (0, catchAsync_1.catchAsync)(Session_1.searchUsers));
// Sessions CRUD
router.get("/", (0, catchAsync_1.catchAsync)(Session_1.getAllSessions));
router.get("/:id", (0, catchAsync_1.catchAsync)(Session_1.getSessionById));
router.post("/", (0, catchAsync_1.catchAsync)(Session_1.createSession));
router.put("/:id", (0, catchAsync_1.catchAsync)(Session_1.updateSession));
router.delete("/:id", (0, catchAsync_1.catchAsync)(Session_1.deleteSession));
exports.default = router;
