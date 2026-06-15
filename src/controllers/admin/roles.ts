import { Request, Response } from "express";
import { db } from "../../models/connection";
import { roles } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import { MODULES, ACTION_NAMES, formatModuleLabel } from "../../types/constant";
import { v4 as uuidv4 } from "uuid";
import { Permission } from "../../types/custom";

// Generate ID للـ Action
const generateActionId = (): string => {
    return uuidv4().replace(/-/g, "").substring(0, 24);
};

// إضافة IDs للـ Actions
const addIdsToPermissions = (permissions: Permission[]): Permission[] => {
    return permissions.map((perm) => ({
        module: perm.module,
        actions: perm.actions.map((act) => ({
            id: act.id || generateActionId(),
            action: act.action,
        })),
    }));
};

// Helper function to parse permissions
const parsePermissions = (permissions: any): Permission[] => {
    if (!permissions) return [];

    try {
        if (Array.isArray(permissions)) {
            return permissions;
        }

        if (typeof permissions === 'string') {
            const parsed = JSON.parse(permissions);
            return Array.isArray(parsed) ? parsed : [];
        }

        return [];
    } catch (error) {
        console.error('Error parsing permissions:', error);
        return [];
    }
};

// Format role response
const formatRole = (role: any) => ({
    id: role.id,
    name: role.name,
    permissions: parsePermissions(role.permissions),
    status: role.status,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
});


// ── Get Admin Modules with Actions (schema for frontend permission builder) ──
export const getAdminPermissions = async (req: Request, res: Response) => {
    const permissions = MODULES.map((module) => ({
        module,
        label: formatModuleLabel(module),
        actions: ACTION_NAMES.map((action) => ({
            key: action.toLowerCase(),
            label: action,
            permission: `${module}.${action.toLowerCase()}`,
        })),
    }));

    return SuccessResponse(res, {
        modules: [...MODULES],
        actions: [...ACTION_NAMES],
        permissions,
    }, 200);
};

// ✅ Get All Roles
export const getAllRoles = async (req: Request, res: Response) => {
    const allRoles = await db.select().from(roles);
    const formattedRoles = allRoles.map(formatRole);

    SuccessResponse(res, { roles: formattedRoles }, 200);
};

// ✅ Get Role By ID
export const getRoleById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const role = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);

    if (!role[0]) {
        throw new NotFound("Role not found");
    }

    SuccessResponse(res, { role: formatRole(role[0]) }, 200);
};

// Validation helper to ensure module and action names exist in constraints
const validatePermissions = (permissions: any): void => {
    if (!permissions) return;
    if (!Array.isArray(permissions)) {
        throw new BadRequest("Permissions must be an array");
    }

    for (const perm of permissions) {
        if (!perm || typeof perm !== "object") {
            throw new BadRequest("Each permission item must be an object");
        }
        if (!perm.module) {
            throw new BadRequest("Each permission item must specify a module");
        }
        // Verify module exists in MODULES
        if (!MODULES.includes(perm.module as any)) {
            throw new BadRequest(`Module "${perm.module}" is invalid. Must be one of the defined module constants.`);
        }

        if (!Array.isArray(perm.actions)) {
            throw new BadRequest(`Actions for module "${perm.module}" must be an array`);
        }

        for (const act of perm.actions) {
            if (!act || typeof act !== "object" || !act.action) {
                throw new BadRequest(`Each action in module "${perm.module}" must be an object with an action field`);
            }
            // Verify action exists in ACTION_NAMES
            if (!ACTION_NAMES.includes(act.action as any)) {
                throw new BadRequest(`Action "${act.action}" in module "${perm.module}" is invalid. Must be one of: ${ACTION_NAMES.join(", ")}`);
            }
        }
    }
};

// ✅ Create Role
export const createRole = async (req: Request, res: Response) => {
    const { name, permissions } = req.body;

    if (!name) {
        throw new BadRequest("Role name is required");
    }

    const existingRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);

    if (existingRole[0]) {
        throw new BadRequest("Role with this name already exists");
    }

    validatePermissions(permissions);
    const permissionsWithIds = addIdsToPermissions(permissions || []);

    // ✅ ابعت array على طول - Drizzle هيتعامل معاه
    await db.insert(roles).values({
        name,
        permissions: permissionsWithIds,
    });

    // جيب الـ role اللي اتعمل
    const createdRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);

    SuccessResponse(res, {
        message: "Role created successfully",
        role: formatRole(createdRole[0])
    }, 201);
};

// ✅ Update Role
export const updateRole = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, permissions, status } = req.body;

    const existingRole = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);

    if (!existingRole[0]) {
        throw new NotFound("Role not found");
    }

    if (name && name !== existingRole[0].name) {
        const duplicateName = await db
            .select()
            .from(roles)
            .where(eq(roles.name, name))
            .limit(1);

        if (duplicateName[0]) {
            throw new BadRequest("Role with this name already exists");
        }
    }

    validatePermissions(permissions);
    const currentPermissions = parsePermissions(existingRole[0].permissions);
    const updatedPermissions = permissions
        ? addIdsToPermissions(permissions)
        : currentPermissions;

    // ✅ ابعت array على طول
    await db
        .update(roles)
        .set({
            name: name ?? existingRole[0].name,
            permissions: updatedPermissions,
            status: status ?? existingRole[0].status,
        })
        .where(eq(roles.id, id));

    const updatedRole = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);

    SuccessResponse(res, {
        message: "Role updated successfully",
        role: formatRole(updatedRole[0])
    }, 200);
};

// ✅ Delete Role
export const deleteRole = async (req: Request, res: Response) => {
    const { id } = req.params;

    const existingRole = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);

    if (!existingRole[0]) {
        throw new NotFound("Role not found");
    }

    await db.delete(roles).where(eq(roles.id, id));

    SuccessResponse(res, { message: "Role deleted successfully" }, 200);
};

// ✅ Toggle Role Status
export const toggleRoleStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    const existingRole = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);

    if (!existingRole[0]) {
        throw new NotFound("Role not found");
    }

    const newStatus = existingRole[0].status === "active" ? "inactive" : "active";

    await db.update(roles).set({ status: newStatus }).where(eq(roles.id, id));

    const updatedRole = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);

    SuccessResponse(res, {
        message: `Role ${newStatus}`,
        role: formatRole(updatedRole[0])
    }, 200);
};

// ✅ Get Available Permissions — full catalogue with human-readable labels
export const getAvailablePermissions = async (req: Request, res: Response) => {
    const permissions = MODULES.map((module) => ({
        module,
        label: formatModuleLabel(module),
        actions: ACTION_NAMES.map((action) => ({
            id: generateActionId(),
            action,
            label: action,
            permission: `${module}.${action.toLowerCase()}`,
        })),
    }));

    SuccessResponse(res, {
        modules: [...MODULES],
        actions: [...ACTION_NAMES],
        // permissions,
    }, 200);
};
