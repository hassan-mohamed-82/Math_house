"use strict";
// controllers/admin.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleParentStatus = exports.deleteParent = exports.updateParent = exports.getParentById = exports.getAllParents = exports.createParent = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const createParent = async (req, res) => {
    const { name, email, phoneNumber, password, status } = req.body;
    const existingParent = await connection_1.db
        .select()
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.email, email));
    if (existingParent.length > 0) {
        throw new BadRequest_1.BadRequest("email is already exists");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const id = (0, uuid_1.v4)();
    await connection_1.db.insert(schema_1.parents).values({
        id,
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        status: status || "active"
    });
    return (0, response_1.SuccessResponse)(res, { message: "create parent success", data: { id } });
};
exports.createParent = createParent;
const getAllParents = async (req, res) => {
    const allParents = await connection_1.db
        .select({
        id: schema_1.parents.id,
        name: schema_1.parents.name,
        email: schema_1.parents.email,
        phoneNumber: schema_1.parents.phoneNumber,
        status: schema_1.parents.status,
        createdAt: schema_1.parents.createdAt,
        updatedAt: schema_1.parents.updatedAt
    })
        .from(schema_1.parents);
    (0, response_1.SuccessResponse)(res, { message: "get all parents success", data: allParents });
};
exports.getAllParents = getAllParents;
const getParentById = async (req, res) => {
    const { id } = req.params;
    const parent = await connection_1.db
        .select({
        id: schema_1.parents.id,
        name: schema_1.parents.name,
        email: schema_1.parents.email,
        phoneNumber: schema_1.parents.phoneNumber,
        status: schema_1.parents.status,
        createdAt: schema_1.parents.createdAt,
        updatedAt: schema_1.parents.updatedAt
    })
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.id, id));
    if (parent.length === 0) {
        throw new NotFound_1.NotFound("parent not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "get parent by id success", data: parent[0] });
};
exports.getParentById = getParentById;
const updateParent = async (req, res) => {
    const { id } = req.params;
    const { name, email, phoneNumber, status, oldPassword, newPassword } = req.body;
    const existingParent = await connection_1.db
        .select()
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.id, id));
    if (existingParent.length === 0) {
        throw new NotFound_1.NotFound("parent not found");
    }
    if (email && email !== existingParent[0].email) {
        const emailExists = await connection_1.db
            .select()
            .from(schema_1.parents)
            .where((0, drizzle_orm_1.eq)(schema_1.parents.email, email));
        if (emailExists.length > 0) {
            throw new BadRequest_1.BadRequest("email is already exists");
        }
    }
    const updateData = {
        updatedAt: new Date()
    };
    if (name)
        updateData.name = name;
    if (email)
        updateData.email = email;
    if (phoneNumber)
        updateData.phoneNumber = phoneNumber;
    if (status)
        updateData.status = status;
    if (newPassword && oldPassword) {
        const isPasswordValid = await bcrypt_1.default.compare(oldPassword, existingParent[0].password);
        if (!isPasswordValid) {
            throw new BadRequest_1.BadRequest("old password is not correct");
        }
        updateData.password = await bcrypt_1.default.hash(newPassword, 10);
    }
    if (Object.keys(updateData).length === 1) {
        throw new BadRequest_1.BadRequest("no data to update");
    }
    await connection_1.db
        .update(schema_1.parents)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "update parent success" });
};
exports.updateParent = updateParent;
const deleteParent = async (req, res) => {
    const { id } = req.params;
    const parent = await connection_1.db
        .select()
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.id, id));
    if (parent.length === 0) {
        throw new NotFound_1.NotFound("parent not found");
    }
    await connection_1.db.delete(schema_1.parents).where((0, drizzle_orm_1.eq)(schema_1.parents.id, id));
    (0, response_1.SuccessResponse)(res, { message: "delete parent success" });
};
exports.deleteParent = deleteParent;
const toggleParentStatus = async (req, res) => {
    const { id } = req.params;
    const parent = await connection_1.db
        .select()
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.id, id));
    if (parent.length === 0) {
        throw new NotFound_1.NotFound("parent not found");
    }
    const newStatus = parent[0].status === "active" ? "inactive" : "active";
    await connection_1.db
        .update(schema_1.parents)
        .set({
        status: newStatus,
        updatedAt: new Date()
    })
        .where((0, drizzle_orm_1.eq)(schema_1.parents.id, id));
    return (0, response_1.SuccessResponse)(res, { message: `toggle parent status success` });
};
exports.toggleParentStatus = toggleParentStatus;
