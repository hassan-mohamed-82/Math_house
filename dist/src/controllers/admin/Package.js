"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePackage = exports.updatePackage = exports.getPackageById = exports.getAllPackages = exports.createPackage = exports.getCoursesByCategory = exports.selectOptions = void 0;
const connection_1 = require("../../models/connection");
const Package_1 = require("../../models/schema/admin/Package");
const category_1 = require("../../models/schema/admin/category");
const courses_1 = require("../../models/schema/admin/courses");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const uuid_1 = require("uuid");
// ===================== SELECT OPTIONS =====================
const selectOptions = async (req, res) => {
    const categoriesList = await connection_1.db.select({
        id: category_1.category.id,
        name: category_1.category.name,
    }).from(category_1.category);
    (0, response_1.SuccessResponse)(res, {
        types: [
            { value: "exam", label: "Exam" },
            { value: "question", label: "Question" },
            { value: "live", label: "Live" },
        ],
        categories: categoriesList.map(c => ({
            value: c.id,
            label: c.name
        })),
    });
};
exports.selectOptions = selectOptions;
const getCoursesByCategory = async (req, res) => {
    const { categoryId } = req.params;
    const coursesList = await connection_1.db
        .select({
        id: courses_1.courses.id,
        name: courses_1.courses.name,
    })
        .from(courses_1.courses)
        .where((0, drizzle_orm_1.eq)(courses_1.courses.categoryId, categoryId));
    (0, response_1.SuccessResponse)(res, coursesList.map(c => ({
        value: c.id,
        label: c.name
    })));
};
exports.getCoursesByCategory = getCoursesByCategory;
// ===================== PACKAGES CRUD =====================
const createPackage = async (req, res) => {
    const { name, type, categoryId, courseId, number, price, duration } = req.body;
    if (!name || !type || !categoryId || !courseId || !number || !price || !duration) {
        throw new BadRequest_1.BadRequest("All fields are required");
    }
    const id = (0, uuid_1.v4)();
    await connection_1.db.insert(Package_1.packages).values({
        id,
        name,
        type,
        categoryId,
        courseId,
        number: Number(number),
        price: String(price),
        duration: Number(duration)
    });
    (0, response_1.SuccessResponse)(res, { id }, 201);
};
exports.createPackage = createPackage;
const getAllPackages = async (req, res) => {
    const { page = 1, limit = 10, type, categoryId, courseId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (type) {
        conditions.push((0, drizzle_orm_1.eq)(Package_1.packages.type, type));
    }
    if (categoryId) {
        conditions.push((0, drizzle_orm_1.eq)(Package_1.packages.categoryId, categoryId));
    }
    if (courseId) {
        conditions.push((0, drizzle_orm_1.eq)(Package_1.packages.courseId, courseId));
    }
    const packagesList = await connection_1.db
        .select({
        id: Package_1.packages.id,
        name: Package_1.packages.name,
        type: Package_1.packages.type,
        categoryId: Package_1.packages.categoryId,
        categoryName: category_1.category.name,
        courseId: Package_1.packages.courseId,
        courseName: courses_1.courses.name,
        number: Package_1.packages.number,
        price: Package_1.packages.price,
        duration: Package_1.packages.duration,
    })
        .from(Package_1.packages)
        .leftJoin(category_1.category, (0, drizzle_orm_1.eq)(Package_1.packages.categoryId, category_1.category.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(Package_1.packages.courseId, courses_1.courses.id))
        .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .limit(Number(limit))
        .offset(offset);
    (0, response_1.SuccessResponse)(res, packagesList);
};
exports.getAllPackages = getAllPackages;
const getPackageById = async (req, res) => {
    const { id } = req.params;
    const [pkg] = await connection_1.db
        .select({
        id: Package_1.packages.id,
        name: Package_1.packages.name,
        type: Package_1.packages.type,
        categoryId: Package_1.packages.categoryId,
        categoryName: category_1.category.name,
        courseId: Package_1.packages.courseId,
        courseName: courses_1.courses.name,
        number: Package_1.packages.number,
        price: Package_1.packages.price,
        duration: Package_1.packages.duration,
    })
        .from(Package_1.packages)
        .leftJoin(category_1.category, (0, drizzle_orm_1.eq)(Package_1.packages.categoryId, category_1.category.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(Package_1.packages.courseId, courses_1.courses.id))
        .where((0, drizzle_orm_1.eq)(Package_1.packages.id, id));
    if (!pkg) {
        throw new Errors_1.NotFound("Package not found");
    }
    (0, response_1.SuccessResponse)(res, pkg);
};
exports.getPackageById = getPackageById;
const updatePackage = async (req, res) => {
    const { id } = req.params;
    const { name, type, categoryId, courseId, number, price, duration } = req.body;
    // تأكد من وجود الـ Package
    const [existing] = await connection_1.db
        .select({ id: Package_1.packages.id })
        .from(Package_1.packages)
        .where((0, drizzle_orm_1.eq)(Package_1.packages.id, id));
    if (!existing) {
        throw new Errors_1.NotFound("Package not found");
    }
    await connection_1.db.update(Package_1.packages)
        .set({
        name,
        type,
        categoryId,
        courseId,
        number: Number(number),
        price: String(price),
        duration: Number(duration),
        updatedAt: new Date()
    })
        .where((0, drizzle_orm_1.eq)(Package_1.packages.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Package updated successfully" });
};
exports.updatePackage = updatePackage;
const deletePackage = async (req, res) => {
    const { id } = req.params;
    // تأكد من وجود الـ Package
    const [existing] = await connection_1.db
        .select({ id: Package_1.packages.id })
        .from(Package_1.packages)
        .where((0, drizzle_orm_1.eq)(Package_1.packages.id, id));
    if (!existing) {
        throw new Errors_1.NotFound("Package not found");
    }
    await connection_1.db.delete(Package_1.packages).where((0, drizzle_orm_1.eq)(Package_1.packages.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Package deleted successfully" });
};
exports.deletePackage = deletePackage;
