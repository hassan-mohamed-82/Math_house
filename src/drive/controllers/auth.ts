import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { BadRequest, UnauthorizedError } from "../../Errors";
import { db } from "../../models/connection";
import { admins } from "../../models/schema";
import { SuccessResponse } from "../../utils/response";
import { generateAdminToken } from "../../utils/jwt";

export const login = async (req: Request, res: Response) => {
	const { email, password } = req.body;

	if (!email || !password) {
		throw new BadRequest("Email and password are required");
	}

	const [admin] = await db
		.select()
		.from(admins)
		.where(eq(admins.email, email));

	if (!admin) {
		throw new UnauthorizedError("Invalid Credentials");
	}

	const isPasswordValid = await bcrypt.compare(password, admin.password);
	if (!isPasswordValid) {
		throw new UnauthorizedError("Invalid Credentials");
	}

	if (admin.status !== "active") {
		throw new UnauthorizedError("Admin is inactive");
	}

	if (admin.type !== "super_admin") {
		throw new UnauthorizedError("Only super admins can access Drive");
	}

	const token = generateAdminToken({
		id: admin.id,
		name: admin.name,
		role: "admin",
	});

	return SuccessResponse(res, {
		message: "Drive login successful",
		token,
		admin: {
			id: admin.id,
			name: admin.name,
			email: admin.email,
			phoneNumber: admin.phoneNumber,
			type: admin.type,
			status: admin.status,
		},
	}, 200);
};
