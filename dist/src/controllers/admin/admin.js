"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdmin = createAdmin;
exports.getAllAdmins = getAllAdmins;
exports.getAdminById = getAdminById;
exports.updateAdmin = updateAdmin;
exports.deleteAdmin = deleteAdmin;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const bcrypt_1 = __importDefault(require("bcrypt"));
const BadRequest_1 = require("../../Errors/BadRequest");
async function createAdmin(req, res) {
    const { name, nickname, phoneNumber, type, avatar, email, password, roleId, permissions } = req.body;
    if (!name || !email || !password || !roleId || !phoneNumber) {
        throw new BadRequest_1.BadRequest("All fields are required");
    }
    const existingAdmin = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.email, email));
    if (existingAdmin.length > 0) {
        throw new BadRequest_1.BadRequest("Admin already exists");
    }
    const existingPhoneNumber = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.phoneNumber, phoneNumber));
    if (existingPhoneNumber.length > 0) {
        throw new BadRequest_1.BadRequest("Phone number already exists");
    }
    if (roleId && !permissions) {
        throw new BadRequest_1.BadRequest("Permissions are required");
    }
    if (!type) {
        throw new BadRequest_1.BadRequest("Type is required");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    await connection_1.db.insert(schema_1.admins).values({
        name,
        nickname: nickname || name,
        phoneNumber,
        email,
        password: hashedPassword,
        avatar,
        type,
        roleId,
        permissions: permissions || [],
    });
    return (0, response_1.SuccessResponse)(res, { message: "Admin created successfully" }, 200);
}
async function getAllAdmins(req, res) {
    const AllAdmins = await connection_1.db.query.admins.findMany();
    return (0, response_1.SuccessResponse)(res, { message: "Admins fetched successfully", admins: AllAdmins }, 200);
}
async function getAdminById(req, res) {
    const { id } = req.params;
    const admin = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Admin fetched successfully", admin }, 200);
}
async function updateAdmin(req, res) {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Admin id is required");
    }
    const { name, email, password, nickname, type, phoneNumber, avatar, roleId, permissions } = req.body;
    const admin = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.id, id));
    if (!admin) {
        throw new BadRequest_1.BadRequest("Admin not found");
    }
    if (roleId && !permissions) {
        throw new BadRequest_1.BadRequest("Permissions are required");
    }
    if (type) {
        if (type !== "admin" && type !== "teacher") {
            throw new BadRequest_1.BadRequest("Invalid type");
        }
    }
    await connection_1.db.update(schema_1.admins).set({
        name: name || schema_1.admins.name,
        email: email || schema_1.admins.email,
        password: password || schema_1.admins.password,
        nickname: nickname || schema_1.admins.nickname,
        phoneNumber: phoneNumber || schema_1.admins.phoneNumber,
        type: type || schema_1.admins.type,
        avatar: avatar || schema_1.admins.avatar,
        roleId: roleId || schema_1.admins.roleId,
        permissions: permissions || schema_1.admins.permissions,
    }).where((0, drizzle_orm_1.eq)(schema_1.admins.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Admin updated successfully" }, 200);
}
async function deleteAdmin(req, res) {
    const { id } = req.params;
    const admin = await connection_1.db.delete(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Admin deleted successfully", admin }, 200);
}
