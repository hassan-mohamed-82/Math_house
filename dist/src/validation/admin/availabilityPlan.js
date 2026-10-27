"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlanStatusSchema = exports.proposeSessionsSchema = void 0;
const zod_1 = require("zod");
exports.proposeSessionsSchema = zod_1.z.object({
    sessionIds: zod_1.z.array(zod_1.z.string().min(1, "Session ID is required")).min(1, "Please select at least one session"),
    adminNotes: zod_1.z.string().max(1000).optional(),
    sessionNotes: zod_1.z.array(zod_1.z.object({
        sessionId: zod_1.z.string(),
        notes: zod_1.z.string().max(255).optional(),
    })).optional(),
});
exports.updatePlanStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        "pending_admin_review",
        "plan_proposed",
        "accepted",
        "rejected",
        "cancelled"
    ]),
    adminNotes: zod_1.z.string().max(1000).optional(),
});
