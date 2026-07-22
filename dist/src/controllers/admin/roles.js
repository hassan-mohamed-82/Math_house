"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailablePermissions = exports.toggleRoleStatus = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = exports.getAllRoles = exports.getAdminPermissions = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const constant_1 = require("../../types/constant");
// Strip to clean shape: { module, actions: ["View", "Add", ...] }
const normalizePermissions = (permissions) => {
    return permissions.map((perm) => ({
        module: perm.module,
        actions: perm.actions,
    }));
};
// Helper function to parse permissions
const parsePermissions = (permissions) => {
    if (!permissions)
        return [];
    try {
        if (Array.isArray(permissions)) {
            return permissions;
        }
        if (typeof permissions === 'string') {
            const parsed = JSON.parse(permissions);
            return Array.isArray(parsed) ? parsed : [];
        }
        return [];
    }
    catch (error) {
        console.error('Error parsing permissions:', error);
        return [];
    }
};
// Format role response
const formatRole = (role) => ({
    id: role.id,
    name: role.name,
    permissions: parsePermissions(role.permissions),
    status: role.status,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
});
// ── Get Admin Modules with Actions (schema for frontend permission builder) ──
const getAdminPermissions = async (req, res) => {
    const permissions = constant_1.MODULES.map((module) => ({
        module,
        label: (0, constant_1.formatModuleLabel)(module),
        actions: constant_1.ACTION_NAMES.map((action) => ({
            key: action.toLowerCase(),
            label: action,
            permission: `${module}.${action.toLowerCase()}`,
        })),
    }));
    return (0, response_1.SuccessResponse)(res, {
        modules: [...constant_1.MODULES],
        actions: [...constant_1.ACTION_NAMES],
        permissions,
    }, 200);
};
exports.getAdminPermissions = getAdminPermissions;
// ✅ Get All Roles
const getAllRoles = async (req, res) => {
    const allRoles = await connection_1.db.select().from(schema_1.roles);
    const formattedRoles = allRoles.map(formatRole);
    (0, response_1.SuccessResponse)(res, { roles: formattedRoles }, 200);
};
exports.getAllRoles = getAllRoles;
// ✅ Get Role By ID
const getRoleById = async (req, res) => {
    const { id } = req.params;
    const role = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, id))
        .limit(1);
    if (!role[0]) {
        throw new NotFound_1.NotFound("Role not found");
    }
    (0, response_1.SuccessResponse)(res, { role: formatRole(role[0]) }, 200);
};
exports.getRoleById = getRoleById;
// Validation helper to ensure module and action names exist in constraints
const validatePermissions = (permissions) => {
    if (!permissions)
        return;
    if (!Array.isArray(permissions)) {
        throw new BadRequest_1.BadRequest("Permissions must be an array");
    }
    for (const perm of permissions) {
        if (!perm || typeof perm !== "object") {
            throw new BadRequest_1.BadRequest("Each permission item must be an object");
        }
        if (!perm.module) {
            throw new BadRequest_1.BadRequest("Each permission item must specify a module");
        }
        if (!constant_1.MODULES.includes(perm.module)) {
            throw new BadRequest_1.BadRequest(`Module "${perm.module}" is invalid. Must be one of the defined module constants.`);
        }
        if (!Array.isArray(perm.actions)) {
            throw new BadRequest_1.BadRequest(`Actions for module "${perm.module}" must be an array`);
        }
        for (const act of perm.actions) {
            if (typeof act !== "string") {
                throw new BadRequest_1.BadRequest(`Each action in module "${perm.module}" must be a string (e.g. "View", "Add")`);
            }
            if (!constant_1.ACTION_NAMES.includes(act)) {
                throw new BadRequest_1.BadRequest(`Action "${act}" in module "${perm.module}" is invalid. Must be one of: ${constant_1.ACTION_NAMES.join(", ")}`);
            }
        }
    }
};
// ✅ Create Role
const createRole = async (req, res) => {
    const { name, permissions } = req.body;
    if (!name) {
        throw new BadRequest_1.BadRequest("Role name is required");
    }
    const existingRole = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.name, name))
        .limit(1);
    if (existingRole[0]) {
        throw new BadRequest_1.BadRequest("Role with this name already exists");
    }
    validatePermissions(permissions);
    const normalized = normalizePermissions(permissions || []);
    // ✅ ابعت array على طول - Drizzle هيتعامل معاه
    await connection_1.db.insert(schema_1.roles).values({
        name,
        permissions: normalized,
    });
    // جيب الـ role اللي اتعمل
    const createdRole = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.name, name))
        .limit(1);
    (0, response_1.SuccessResponse)(res, {
        message: "Role created successfully",
        role: formatRole(createdRole[0])
    }, 201);
};
exports.createRole = createRole;
// ✅ Update Role
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, permissions, status } = req.body;
    const existingRole = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, id))
        .limit(1);
    if (!existingRole[0]) {
        throw new NotFound_1.NotFound("Role not found");
    }
    if (name && name !== existingRole[0].name) {
        const duplicateName = await connection_1.db
            .select()
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.eq)(schema_1.roles.name, name))
            .limit(1);
        if (duplicateName[0]) {
            throw new BadRequest_1.BadRequest("Role with this name already exists");
        }
    }
    validatePermissions(permissions);
    const currentPermissions = parsePermissions(existingRole[0].permissions);
    const updatedPermissions = permissions
        ? normalizePermissions(permissions)
        : currentPermissions;
    // ✅ ابعت array على طول
    await connection_1.db
        .update(schema_1.roles)
        .set({
        name: name ?? existingRole[0].name,
        permissions: updatedPermissions,
        status: status ?? existingRole[0].status,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, id));
    const updatedRole = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, id))
        .limit(1);
    (0, response_1.SuccessResponse)(res, {
        message: "Role updated successfully",
        role: formatRole(updatedRole[0])
    }, 200);
};
exports.updateRole = updateRole;
// ✅ Delete Role
const deleteRole = async (req, res) => {
    const { id } = req.params;
    const existingRole = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, id))
        .limit(1);
    if (!existingRole[0]) {
        throw new NotFound_1.NotFound("Role not found");
    }
    await connection_1.db.delete(schema_1.roles).where((0, drizzle_orm_1.eq)(schema_1.roles.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Role deleted successfully" }, 200);
};
exports.deleteRole = deleteRole;
// ✅ Toggle Role Status
const toggleRoleStatus = async (req, res) => {
    const { id } = req.params;
    const existingRole = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, id))
        .limit(1);
    if (!existingRole[0]) {
        throw new NotFound_1.NotFound("Role not found");
    }
    const newStatus = existingRole[0].status === "active" ? "inactive" : "active";
    await connection_1.db.update(schema_1.roles).set({ status: newStatus }).where((0, drizzle_orm_1.eq)(schema_1.roles.id, id));
    const updatedRole = await connection_1.db
        .select()
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.eq)(schema_1.roles.id, id))
        .limit(1);
    (0, response_1.SuccessResponse)(res, {
        message: `Role ${newStatus}`,
        role: formatRole(updatedRole[0])
    }, 200);
};
exports.toggleRoleStatus = toggleRoleStatus;
// ✅ Get Available Permissions — full catalogue with human-readable labels
const getAvailablePermissions = async (req, res) => {
    const permissions = constant_1.MODULES.map((module) => ({
        module,
        label: (0, constant_1.formatModuleLabel)(module),
        actions: constant_1.ACTION_NAMES.map((action) => ({
            action,
            label: action,
            permission: `${module}.${action.toLowerCase()}`,
        })),
    }));
    (0, response_1.SuccessResponse)(res, {
        modules: [...constant_1.MODULES],
        actions: [...constant_1.ACTION_NAMES],
        permissions,
    }, 200);
};
exports.getAvailablePermissions = getAvailablePermissions;
