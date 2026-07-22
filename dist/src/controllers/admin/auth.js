"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.impersonateStudent = impersonateStudent;
exports.switchBack = switchBack;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../../utils/jwt");
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest_1.BadRequest("Email and password are required");
    }
    const admin = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.email, email));
    if (admin.length === 0) {
        throw new Errors_1.UnauthorizedError("Invalid Credentials");
    }
    const isPasswordValid = await bcrypt_1.default.compare(password, admin[0].password);
    if (!isPasswordValid) {
        throw new Errors_1.UnauthorizedError("Invalid Credentials");
    }
    if (admin[0].status === "inactive") {
        throw new Errors_1.UnauthorizedError("Admin is inactive");
    }
    let role = null;
    if (admin[0].roleId) {
        role = await connection_1.db.select().from(schema_1.roles).where((0, drizzle_orm_1.eq)(schema_1.roles.id, admin[0].roleId));
    }
    const tokenPayload = {
        id: admin[0].id,
        name: admin[0].name,
        role: (admin[0].type === "super_admin" ? "superadmin" : (role && role[0] ? role[0].name : "admin")),
        // permissions: admin[0].permissions,
    };
    const token = (0, jwt_1.generateAdminToken)(tokenPayload);
    return (0, response_1.SuccessResponse)(res, {
        message: "Admin logged in successfully", token, admin: {
            name: admin[0].name,
            email: admin[0].email,
            phoneNumber: admin[0].phoneNumber,
            roleId: admin[0].roleId,
            permissions: admin[0].permissions,
            status: admin[0].status,
        }
    }, 200);
}
async function impersonateStudent(req, res) {
    const { studentId } = req.params;
    const actorAdminId = req.user.id;
    const student = await connection_1.db.select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        password: schema_1.Student.password,
        isVerified: schema_1.Student.isVerified,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        categoryName: schema_1.category.name,
        grade: {
            id: schema_1.grade.id,
            name: schema_1.grade.name,
            nameAr: schema_1.grade.nameAr,
        },
        avatar: schema_1.Student.avatar,
        wallet: {
            walletId: schema_1.wallet.id,
            balance: schema_1.wallet.balance,
        }
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.Student.category, schema_1.category.id))
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.Student.grade, schema_1.grade.id))
        .leftJoin(schema_1.wallet, (0, drizzle_orm_1.eq)(schema_1.Student.id, schema_1.wallet.studentId))
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (student.length === 0) {
        throw new BadRequest_1.BadRequest("Student not found");
    }
    const payload = {
        id: student[0].id,
        name: `${student[0].firstname} ${student[0].lastname}`,
        role: "student",
        actorAdminId: actorAdminId
    };
    const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: "30m" });
    return (0, response_1.SuccessResponse)(res, {
        message: "Impersonated student successfully",
        token,
        isImpersonated: true,
        actorAdminId: actorAdminId,
        student: {
            id: student[0].id,
            firstname: student[0].firstname,
            lastname: student[0].lastname,
            email: student[0].email,
            phone: student[0].phone,
            category: {
                id: student[0].category,
                name: student[0].categoryName,
            },
            grade: student[0].grade,
            avatar: student[0].avatar,
            wallet: student[0].wallet
                ? {
                    id: student[0].wallet.walletId,
                    balance: student[0].wallet.balance,
                }
                : null
        }
    }, 200);
}
async function switchBack(req, res) {
    const { actorAdminId } = req.user;
    if (!actorAdminId) {
        throw new Errors_1.UnauthorizedError("Forbidden: You are not impersonating a student.");
    }
    const admin = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.id, actorAdminId));
    if (admin.length === 0) {
        throw new Errors_1.UnauthorizedError("Admin not found.");
    }
    if (admin[0].status === "inactive") {
        throw new Errors_1.UnauthorizedError("Admin is inactive.");
    }
    let role = null;
    if (admin[0].roleId) {
        role = await connection_1.db.select().from(schema_1.roles).where((0, drizzle_orm_1.eq)(schema_1.roles.id, admin[0].roleId));
    }
    const tokenPayload = {
        id: admin[0].id,
        name: admin[0].name,
        role: (admin[0].type === "super_admin" ? "superadmin" : (role && role[0] ? role[0].name : "admin")),
    };
    const token = (0, jwt_1.generateAdminToken)(tokenPayload);
    return (0, response_1.SuccessResponse)(res, {
        message: "Switched back to admin successfully",
        token,
        admin: {
            name: admin[0].name,
            email: admin[0].email,
            phoneNumber: admin[0].phoneNumber,
            roleId: admin[0].roleId,
            permissions: admin[0].permissions,
            status: admin[0].status,
        }
    }, 200);
}
