"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackages = void 0;
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const getPackages = async (req, res) => {
    const AllPackages = await connection_1.db.select({
        id: schema_1.packages.id,
        name: schema_1.packages.name,
        type: schema_1.packages.type,
        categoryId: schema_1.packages.categoryId,
        courseId: schema_1.packages.courseId,
        number: schema_1.packages.number,
        price: schema_1.packages.price,
        duration: schema_1.packages.duration,
        category: {
            id: schema_1.packages.categoryId,
            name: schema_1.category.name,
        },
        course: {
            id: schema_1.packages.courseId,
            name: schema_1.courses.name,
        },
    }).from(schema_1.packages)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.packages.categoryId, schema_1.category.id))
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.packages.courseId, schema_1.courses.id));
    return (0, response_1.SuccessResponse)(res, { message: "Packages retrieved successfully", data: AllPackages });
};
exports.getPackages = getPackages;
