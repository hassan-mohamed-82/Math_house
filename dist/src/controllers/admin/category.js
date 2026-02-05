"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryById = exports.getAllCategory = exports.deleteCategory = exports.updateCategory = exports.createCategory = void 0;
const schema_1 = require("../../models/schema");
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const createCategory = async (req, res) => {
    const { name, description, image } = req.body;
    if (!name) {
        throw new BadRequest_1.BadRequest("Name is required");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.name, name));
    if (existingCategory.length > 0) {
        throw new BadRequest_1.BadRequest("Category already exists");
    }
    const imageUrl = await (0, handleImages_1.validateAndSaveLogo)(req, image, "category");
    await connection_1.db.insert(schema_1.category).values({ name, description, image: imageUrl });
    return (0, response_1.SuccessResponse)(res, { message: "Category created successfully" }, 200);
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Category id is required");
    }
    const { name, description, image } = req.body;
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    await connection_1.db.update(schema_1.category).set({ name: name || existingCategory[0].name, description: description || existingCategory[0].description, image: image || existingCategory[0].image }).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Category updated successfully" }, 200);
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Category id is required");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    await connection_1.db.delete(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Category deleted successfully" }, 200);
};
exports.deleteCategory = deleteCategory;
const getAllCategory = async (req, res) => {
    const categories = await connection_1.db.select().from(schema_1.category);
    return (0, response_1.SuccessResponse)(res, { message: "Categories fetched successfully", data: categories }, 200);
};
exports.getAllCategory = getAllCategory;
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Category id is required");
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Category fetched successfully", data: existingCategory[0] }, 200);
};
exports.getCategoryById = getCategoryById;
