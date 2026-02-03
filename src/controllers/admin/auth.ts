import { Request, Response } from "express";
import { admins } from "../../models/schema";
import { db } from "../../models/connection";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { SuccessResponse } from "../../utils/response";
import { UnauthorizedError } from "../../Errors";
import { generateAdminToken } from "../../utils/jwt";


export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    const admin = await db
        .select()
        .from(admins)
        .where(eq(admins.email, email))
        .limit(1);

    if (!admin[0]) {
        throw new UnauthorizedError("Invalid email or password");
    }

    const match = await bcrypt.compare(password, admin[0].password);
    if (!match) {
        throw new UnauthorizedError("Invalid email or password");
    }

    const tokenPayload = {
        id: admin[0].id,
        role: admin[0].role,
        email: admin[0].email,
        name: admin[0].name,
    };

    const token = generateAdminToken(tokenPayload);

    return SuccessResponse(
        res,
        {
            message: "Login successful",
            token,
            user: {
                id: admin[0].id,
                name: admin[0].name,
                email: admin[0].email,
                role: admin[0].role,
            },
        },
        200
    );
}