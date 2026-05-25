"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSection = exports.updateSection = exports.getSectionById = exports.getAllSections = exports.createSection = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const drizzle_orm_1 = require("drizzle-orm");
const createSection = async (req, res) => {
    const { sectionName, sectionDescription, sectionTime } = req.body;
    if (!sectionName || !sectionDescription || !sectionTime) {
        throw new BadRequest_1.BadRequest("All fields are required");
    }
    await connection_1.db.insert(schema_1.Sections).values({
        sectionName,
        sectionDescription,
        sectionTime
    });
    return (0, response_1.SuccessResponse)(res, { message: "Section Created Successfully" }, 201);
};
exports.createSection = createSection;
const getAllSections = async (req, res) => {
    const sections = await connection_1.db.select().from(schema_1.Sections).orderBy((0, drizzle_orm_1.desc)(schema_1.Sections.createdAt));
    return (0, response_1.SuccessResponse)(res, { message: "Sections Fetched Successfully", sections }, 200);
};
exports.getAllSections = getAllSections;
const getSectionById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Section Id is required");
    }
    const section = await connection_1.db.select().from(schema_1.Sections).where((0, drizzle_orm_1.eq)(schema_1.Sections.id, id));
    if (section.length === 0) {
        throw new BadRequest_1.BadRequest("Section not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Section Fetched Successfully", section: section[0] }, 200);
};
exports.getSectionById = getSectionById;
const updateSection = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Section Id is required");
    }
    const { sectionName, sectionDescription, sectionTime } = req.body;
    const section = await connection_1.db.select().from(schema_1.Sections).where((0, drizzle_orm_1.eq)(schema_1.Sections.id, id));
    if (section.length === 0) {
        throw new BadRequest_1.BadRequest("Section not found");
    }
    await connection_1.db.update(schema_1.Sections).set({
        sectionName,
        sectionDescription,
        sectionTime,
        updatedAt: new Date()
    }).where((0, drizzle_orm_1.eq)(schema_1.Sections.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Section Updated Successfully" }, 200);
};
exports.updateSection = updateSection;
const deleteSection = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Section Id is required");
    }
    const section = await connection_1.db.select().from(schema_1.Sections).where((0, drizzle_orm_1.eq)(schema_1.Sections.id, id));
    if (section.length === 0) {
        throw new BadRequest_1.BadRequest("Section not found");
    }
    await connection_1.db.delete(schema_1.Sections).where((0, drizzle_orm_1.eq)(schema_1.Sections.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Section Deleted Successfully" }, 200);
};
exports.deleteSection = deleteSection;
