"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSemester = exports.updateSemester = exports.getSemesterbyId = exports.getSemesters = exports.getCategoriesSelection = exports.createSemester = void 0;
const connection_1 = require("../../models/connection");
const semester_1 = require("../../models/schema/admin/semester");
const drizzle_orm_1 = require("drizzle-orm");
const category_1 = require("../../models/schema/admin/category");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const createSemester = async (req, res) => {
    const { name, categoryId } = req.body;
    if (!name || !categoryId) {
        throw new BadRequest_1.BadRequest("Name and Category are Required");
    }
    const exisitingCategory = await connection_1.db.select().from(category_1.category).where((0, drizzle_orm_1.eq)(category_1.category.id, categoryId));
    if (exisitingCategory.length === 0) {
        throw new NotFound_1.NotFound("Category not found");
    }
    // Check if the category has children
    // We search for any category where the parentCategoryId is the ID we are trying to use.
    const children = await connection_1.db
        .select({ id: category_1.category.id })
        .from(category_1.category)
        .where((0, drizzle_orm_1.eq)(category_1.category.parentCategoryId, categoryId))
        .limit(1); // Optimization: We stop looking after finding just one child
    if (children.length > 0) {
        throw new BadRequest_1.BadRequest("Invalid Category: You can only add a semester to a leaf category (one with no children).");
    }
    await connection_1.db.insert(semester_1.semesters).values({ name, categoryId });
    return (0, response_1.SuccessResponse)(res, { message: "Semester created successfully" }, 201);
};
exports.createSemester = createSemester;
const getCategoriesSelection = async (req, res) => {
    const child = (0, drizzle_orm_1.aliasedTable)(category_1.category, "child");
    const categories = await connection_1.db.selectDistinct({
        id: category_1.category.id,
        name: category_1.category.name
    })
        .from(category_1.category)
        .leftJoin(child, (0, drizzle_orm_1.eq)(child.parentCategoryId, category_1.category.id))
        .where((0, drizzle_orm_1.isNull)(child.id));
    return (0, response_1.SuccessResponse)(res, { message: "Categories fetched successfully", data: categories }, 200);
};
exports.getCategoriesSelection = getCategoriesSelection;
const getSemesters = async (req, res) => {
    const AllSemesters = await connection_1.db.select({
        id: semester_1.semesters.id,
        name: semester_1.semesters.name,
        categoryId: semester_1.semesters.categoryId,
        category: {
            id: category_1.category.id,
            name: category_1.category.name
        }
    }).from(semester_1.semesters).innerJoin(category_1.category, (0, drizzle_orm_1.eq)(category_1.category.id, semester_1.semesters.categoryId));
    return (0, response_1.SuccessResponse)(res, { message: "Semesters fetched successfully", data: AllSemesters }, 200);
};
exports.getSemesters = getSemesters;
const getSemesterbyId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Semester ID is required");
    }
    const semester = await connection_1.db.select({
        id: semester_1.semesters.id,
        name: semester_1.semesters.name,
        categoryId: semester_1.semesters.categoryId,
        category: {
            id: category_1.category.id,
            name: category_1.category.name
        }
    }).from(semester_1.semesters).innerJoin(category_1.category, (0, drizzle_orm_1.eq)(category_1.category.id, semester_1.semesters.categoryId)).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    if (semester.length === 0) {
        throw new NotFound_1.NotFound("Semester not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Semester fetched successfully", data: semester }, 200);
};
exports.getSemesterbyId = getSemesterbyId;
const updateSemester = async (req, res) => {
    const { id } = req.params;
    const { name, categoryId } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("Semester ID is required");
    }
    if (categoryId) {
        const exisitingCategory = await connection_1.db.select().from(category_1.category).where((0, drizzle_orm_1.eq)(category_1.category.id, categoryId));
        if (exisitingCategory.length === 0) {
            throw new NotFound_1.NotFound("Category not found");
        }
    }
    const existingSemester = await connection_1.db.select().from(semester_1.semesters).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound_1.NotFound("Semester not found");
    }
    const children = await connection_1.db
        .select({ id: category_1.category.id })
        .from(category_1.category)
        .where((0, drizzle_orm_1.eq)(category_1.category.parentCategoryId, categoryId))
        .limit(1); // Optimization: We stop looking after finding just one child
    if (children.length > 0) {
        throw new BadRequest_1.BadRequest("Invalid Category: You can only add a semester to a leaf category (one with no children). ");
    }
    await connection_1.db.update(semester_1.semesters).set({
        name: name || semester_1.semesters.name,
        categoryId: categoryId || semester_1.semesters.categoryId
    }).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Semester updated successfully" }, 200);
};
exports.updateSemester = updateSemester;
const deleteSemester = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Semester ID is required");
    }
    const existingSemester = await connection_1.db.select().from(semester_1.semesters).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    if (existingSemester.length === 0) {
        throw new NotFound_1.NotFound("Semester not found");
    }
    await connection_1.db.delete(semester_1.semesters).where((0, drizzle_orm_1.eq)(semester_1.semesters.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Semester deleted successfully" }, 200);
};
exports.deleteSemester = deleteSemester;
