"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const diagnosticExam_1 = require("../../controllers/user/diagnosticExam");
const router = (0, express_1.Router)();
router.get("/", diagnosticExam_1.getDiagnosticExams);
router.get("/:id", diagnosticExam_1.getDiagnosticExamById);
router.get("/:id/questions", diagnosticExam_1.getDiagnosticExamOptions);
exports.default = router;
