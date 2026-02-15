"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExamCode = exports.updateExamCode = exports.createExamCode = exports.getExamCodes = void 0;
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const getExamCodes = async (req, res) => {
    const AllExamCode = await connection_1.db.select().from(schema_1.examCodes);
    return (0, response_1.SuccessResponse)(res, { message: "Exam codes fetched successfully", data: AllExamCode }, 200);
};
exports.getExamCodes = getExamCodes;
const createExamCode = async (req, res) => {
    const { code } = req.body;
    if (!code)
        throw new BadRequest_1.BadRequest("Code is required");
    await connection_1.db.insert(schema_1.examCodes).values({ code });
    return (0, response_1.SuccessResponse)(res, { message: "Exam code created successfully" }, 201);
};
exports.createExamCode = createExamCode;
const updateExamCode = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Id is required");
    const { code } = req.body;
    const examCode = await connection_1.db.query.examCodes.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.examCodes.id, id) });
    if (!examCode)
        throw new Errors_1.NotFound("Exam code not found");
    await connection_1.db.update(schema_1.examCodes).set({ code: code || examCode.code }).where((0, drizzle_orm_1.eq)(schema_1.examCodes.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Exam code updated successfully" }, 200);
};
exports.updateExamCode = updateExamCode;
const deleteExamCode = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Id is required");
    const examCode = await connection_1.db.query.examCodes.findFirst({ where: (0, drizzle_orm_1.eq)(schema_1.examCodes.id, id) });
    if (!examCode)
        throw new Errors_1.NotFound("Exam code not found");
    await connection_1.db.delete(schema_1.examCodes).where((0, drizzle_orm_1.eq)(schema_1.examCodes.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Exam code deleted successfully" }, 200);
};
exports.deleteExamCode = deleteExamCode;
