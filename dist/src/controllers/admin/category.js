"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryLineage = exports.getCategoryById = exports.getAllCategory = exports.deleteCategory = exports.updateCategory = exports.createCategory = void 0;
const schema_1 = require("../../models/schema");
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const handleImages_1 = require("../../utils/handleImages");
const handleImages_2 = require("../../utils/handleImages");
const createCategory = async (req, res) => {
    const { name, description, image, parentCategoryId } = req.body;
    if (!name) {
        throw new BadRequest_1.BadRequest("Name is required");
    }
    if (parentCategoryId) {
        const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, parentCategoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest_1.BadRequest("Parent category not found");
        }
    }
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.name, name));
    if (existingCategory.length > 0) {
        throw new BadRequest_1.BadRequest("Category already exists");
    }
    const imageUrl = await (0, handleImages_1.validateAndSaveLogo)(req, image, "category");
    await connection_1.db.insert(schema_1.category).values({ name, description, image: imageUrl, parentCategoryId });
    return (0, response_1.SuccessResponse)(res, { message: "Category created successfully" }, 200);
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Category id is required");
    }
    const { name, description, image, parentCategoryId } = req.body;
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    if (parentCategoryId) {
        const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, parentCategoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest_1.BadRequest("Parent category not found");
        }
    }
    const imageUrl = await (0, handleImages_1.handleImageUpdate)(req, existingCategory[0].image, image, "category");
    await connection_1.db.update(schema_1.category).set({
        name: name || existingCategory[0].name,
        description: description || existingCategory[0].description,
        image: imageUrl || existingCategory[0].image,
        parentCategoryId: parentCategoryId || existingCategory[0].parentCategoryId
    }).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
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
    if (existingCategory[0].image) {
        await (0, handleImages_2.deleteImage)(existingCategory[0].image);
    }
    return (0, response_1.SuccessResponse)(res, { message: "Category deleted successfully" }, 200);
};
exports.deleteCategory = deleteCategory;
const getAllCategory = async (req, res) => {
    const categories = await connection_1.db.select().from(schema_1.category);
    const categoryMap = new Map();
    categories.forEach(cat => categoryMap.set(cat.id, cat));
    const data = categories.map(cat => {
        const ancestors = [];
        let current = cat;
        let level = 1;
        while (current.parentCategoryId) {
            const parent = categoryMap.get(current.parentCategoryId);
            if (parent) {
                ancestors.push({ id: parent.id, name: parent.name, level: level++ });
                current = parent;
            }
            else {
                break;
            }
        }
        return {
            ...cat,
            ancestors
        };
    });
    return (0, response_1.SuccessResponse)(res, { message: "Categories fetched successfully", data }, 200);
};
exports.getAllCategory = getAllCategory;
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Category id is required");
    }
    const categories = await connection_1.db.select().from(schema_1.category);
    const existingCategory = categories.find((c) => c.id === id);
    if (!existingCategory) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    const categoryMap = new Map();
    categories.forEach((cat) => categoryMap.set(cat.id, cat));
    const ancestors = [];
    let current = existingCategory;
    let level = 1;
    while (current.parentCategoryId) {
        const parent = categoryMap.get(current.parentCategoryId);
        if (parent) {
            ancestors.push({ id: parent.id, name: parent.name, level: level++ });
            current = parent;
        }
        else {
            break;
        }
    }
    const data = {
        ...existingCategory,
        ancestors,
    };
    return (0, response_1.SuccessResponse)(res, { message: "Category fetched successfully", data }, 200);
};
exports.getCategoryById = getCategoryById;
const getCategoryLineage = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Category id is required");
    }
    // Verify category exists first
    const existingCategory = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, id));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("Category not found");
    }
    const query = (0, drizzle_orm_1.sql) `
        WITH RECURSIVE category_path AS (
            SELECT id, name, description, image, parent_category_id, created_at, updated_at, 0 as level
            FROM category
            WHERE id = ${id}
            UNION ALL
            SELECT c.id, c.name, c.description, c.image, c.parent_category_id, c.created_at, c.updated_at, cp.level + 1
            FROM category c
            JOIN category_path cp ON c.id = cp.parent_category_id
        )
        SELECT * FROM category_path ORDER BY level;
    `;
    const lineage = await connection_1.db.execute(query);
    return (0, response_1.SuccessResponse)(res, { message: "Category lineage fetched successfully", data: lineage[0] }, 200);
};
exports.getCategoryLineage = getCategoryLineage;
