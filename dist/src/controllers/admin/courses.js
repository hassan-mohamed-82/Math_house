"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCourse = void 0;
const connection_1 = require("../../models/connection");
const courses_1 = require("../../models/schema/admin/courses");
const response_1 = require("../../utils/response");
const createCourse = async (req, res) => {
    const { name, mainThumbnail, description, price } = req.body;
    await connection_1.db.insert(courses_1.courses).values({
        name,
        mainThumbnail,
        description,
        price,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Course created successfully" }, 200);
};
exports.createCourse = createCourse;
