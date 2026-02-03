import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../Errors";
import { TokenPayload, Role } from "../types/custom";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET as string;


export const generateAdminToken = (data: {
    id: string;
    name: string;
    email: string;
    role: Role;
}): string => {
    const payload: TokenPayload = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};