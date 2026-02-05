import { Request, Response } from "express";
import { db } from "../../models/connection";
import { courses, category } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";

// TODO
export const createCourse = async (req: Request, res: Response) => {
    const { name, categoryId, teacherId, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;

    if (!name || !categoryId || !teacherId || !duration || !price) {
        throw new BadRequest("Name , Category , Teacher , Duration , Price are required");
    }
    const course = await db.select().from(courses).where(eq(courses.name, name));
    if (course.length > 0) {
        throw new BadRequest("Course already exists");
    }

    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }
    // TODO: Add teacher schema and check for existing teacher
    // const existingTeacher = await db.select().from(teacher).where(eq(teacher.id, teacherId));
    // if (existingTeacher.length === 0) {
    //     throw new BadRequest("Teacher not found");
    // }

    if (discount) {
        if (discount > price) {
            throw new BadRequest("Discount cannot be greater than price");
        }
    }

    const imageURL = await validateAndSaveLogo(req, image, "courses");

    await db.insert(courses).values({
        name,
        categoryId,
        teacherId,
        preRequisition,
        whatYouGain,
        duration,
        image: imageURL,
        description,
        price,
        discount,
    });
    return SuccessResponse(res, { message: "Course created successfully" }, 200);
};

export const getCourseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }
    return SuccessResponse(res, course[0], 200);
}
// TODO Select Course Name , Number of Chapters , Category
// export const getAllCourses = async (req: Request, res: Response) => {
// }

// TODO: Add teacher schema and check for existing teacher
export const updateCourse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, categoryId, teacherId, preRequisition, whatYouGain, duration, image, description, price, discount } = req.body;
    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }
    if (discount) {
        if (discount > price) {
            throw new BadRequest("Discount cannot be greater than price");
        }
    }
    const imageURL = await handleImageUpdate(req, course[0].image, image, "courses");

    const existingCategory = await db.select().from(category).where(eq(category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }
    // TODO: Add teacher schema and check for existing teacher
    // const existingTeacher = await db.select().from(teacher).where(eq(teacher.id, teacherId));
    // if (existingTeacher.length === 0) {
    //     throw new BadRequest("Teacher not found");
    // }


    await db.update(courses).set({
        name: name || course[0].name,
        categoryId: categoryId || course[0].categoryId,
        teacherId: teacherId || course[0].teacherId,
        preRequisition: preRequisition || course[0].preRequisition,
        whatYouGain: whatYouGain || course[0].whatYouGain,
        duration: duration || course[0].duration,
        image: imageURL || course[0].image,
        description: description || course[0].description,
        price: price || course[0].price,
        discount: discount || course[0].discount,
    }).where(eq(courses.id, id));
    return SuccessResponse(res, { message: "Course updated successfully" }, 200);
}

export const deleteCourse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await db.select().from(courses).where(eq(courses.id, id));
    if (course.length === 0) {
        throw new BadRequest("Course not found");
    }
    if (course[0].image) {
        await deleteImage(course[0].image);
    }
    await db.delete(courses).where(eq(courses.id, id));
    return SuccessResponse(res, { message: "Course deleted successfully" }, 200);
}