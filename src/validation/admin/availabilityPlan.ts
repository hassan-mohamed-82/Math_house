import { z } from "zod";

export const proposeSessionsSchema = z.object({
    sessionIds: z.array(z.string().min(1, "Session ID is required")).min(1, "Please select at least one session"),
    adminNotes: z.string().max(1000).optional(),
    sessionNotes: z.array(z.object({
        sessionId: z.string(),
        notes: z.string().max(255).optional(),
    })).optional(),
});

export const updatePlanStatusSchema = z.object({
    status: z.enum([
        "pending_admin_review",
        "plan_proposed",
        "accepted",
        "rejected",
        "cancelled"
    ]),
    adminNotes: z.string().max(1000).optional(),
});
