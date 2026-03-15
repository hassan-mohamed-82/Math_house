"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionsHistory = void 0;
const Errors_1 = require("../../Errors");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
const QuestionsHistory = async (req, res) => {
};
exports.QuestionsHistory = QuestionsHistory;
