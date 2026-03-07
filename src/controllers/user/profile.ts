import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../../models/connection";
import { category, Student, wallet } from "../../models/schema";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

const getAuthenticatedStudentId = (req: Request) => {
	if (!req.user?.id) {
		throw new UnauthorizedError("Not authenticated");
	}

	return req.user.id;
};

const ensureWalletExists = async (studentId: string) => {
	const [existingWallet] = await db
		.select({ id: wallet.id, balance: wallet.balance })
		.from(wallet)
		.where(eq(wallet.studentId, studentId));

	if (existingWallet) {
		return existingWallet;
	}

	await db.insert(wallet).values({
		studentId,
		balance: 0,
	});

	return { balance: 0 };
};

const getStudentProfileData = async (studentId: string) => {
	const [student] = await db
		.select({
			id: Student.id,
			firstname: Student.firstname,
			lastname: Student.lastname,
			nickname: Student.nickname,
			email: Student.email,
			phone: Student.phone,
			parentphone: Student.parentphone,
			grade: Student.grade,
			categoryId: Student.category,
			categoryName: category.name,
		})
		.from(Student)
		.leftJoin(category, eq(Student.category, category.id))
		.where(eq(Student.id, studentId));

	if (!student) {
		throw new NotFound("student not found");
	}

	const studentWallet = await ensureWalletExists(student.id);

	return {
		id: student.id,
		firstname: student.firstname,
		lastname: student.lastname,
		nickname: student.nickname,
		fullName: `${student.firstname} ${student.lastname}`,
		email: student.email,
		phone: student.phone,
		parentphone: student.parentphone,
		grade: student.grade,
		category: {
			id: student.categoryId,
			name: student.categoryName,
		},
		wallet: {
			balance: studentWallet.balance,
		},
	};
};

export const getMyProfile = async (req: Request, res: Response) => {
	const studentId = getAuthenticatedStudentId(req);
	const profile = await getStudentProfileData(studentId);

	return SuccessResponse(res, {
		message: "Profile fetched successfully",
		student: profile,
	});
};

export const updateMyProfile = async (req: Request, res: Response) => {
	const studentId = getAuthenticatedStudentId(req);
	const { firstname, lastname, nickname, email, phone, parentphone } = req.body;

	const [existingStudent] = await db
		.select()
		.from(Student)
		.where(eq(Student.id, studentId));

	if (!existingStudent) {
		throw new NotFound("student not found");
	}

	if (email && email !== existingStudent.email) {
		const [emailExists] = await db
			.select({ id: Student.id })
			.from(Student)
			.where(eq(Student.email, email));

		if (emailExists) {
			throw new BadRequest("email already exists");
		}
	}

	const updateData: Partial<typeof Student.$inferInsert> = {};

	if (firstname) updateData.firstname = firstname;
	if (lastname) updateData.lastname = lastname;
	if (nickname) updateData.nickname = nickname;
	if (email) updateData.email = email;
	if (phone) updateData.phone = phone;
	if (parentphone) updateData.parentphone = parentphone;

	if (Object.keys(updateData).length === 0) {
		const profile = await getStudentProfileData(studentId);

		return SuccessResponse(res, {
			message: "Profile updated successfully",
			student: profile,
		});
	}

	await db
		.update(Student)
		.set(updateData)
		.where(eq(Student.id, studentId));

	const profile = await getStudentProfileData(studentId);

	return SuccessResponse(res, {
		message: "Profile updated successfully",
		student: profile,
	});
};

export const changeMyPassword = async (req: Request, res: Response) => {
	const studentId = getAuthenticatedStudentId(req);
	const { oldPassword, newPassword } = req.body;

	if (!oldPassword || !newPassword) {
		throw new BadRequest("oldPassword and newPassword are required");
	}

	const [student] = await db
		.select({ id: Student.id, password: Student.password })
		.from(Student)
		.where(eq(Student.id, studentId));

	if (!student) {
		throw new NotFound("student not found");
	}

	const isPasswordValid = await bcrypt.compare(oldPassword, student.password);

	if (!isPasswordValid) {
		throw new BadRequest("old password is not valid");
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10);

	await db
		.update(Student)
		.set({ password: hashedPassword })
		.where(eq(Student.id, studentId));

	return SuccessResponse(res, {
		message: "Password changed successfully",
	});
};
