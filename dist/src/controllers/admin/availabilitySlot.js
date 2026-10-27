"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminAvailabilitySlot = exports.updateAdminSlotStatus = exports.updateAdminAvailabilitySlot = exports.createAdminAvailabilitySlot = exports.getAdminAvailabilitySlotById = exports.getAdminAvailabilitySlots = exports.formatSlotsByDays = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const StudentAvailabilityPlan_1 = require("../../models/schema/admin/StudentAvailabilityPlan");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const formatSlotsByDays = (slots) => {
    const grouped = {
        Saturday: [],
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
    };
    for (const slot of slots) {
        if (grouped[slot.dayOfWeek]) {
            grouped[slot.dayOfWeek].push(slot);
        }
    }
    // Sort slots within each day by timeFrom ascending
    for (const day of StudentAvailabilityPlan_1.DAYS_OF_WEEK) {
        grouped[day].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
    }
    const days = StudentAvailabilityPlan_1.DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day,
        count: grouped[day].length,
        slots: grouped[day],
    }));
    return { days, grouped, slots };
};
exports.formatSlotsByDays = formatSlotsByDays;
// ── 1. Get All Availability Slots (Admin) ───────────────────────────────────
// By default returns all 7 days of the week and all configured slots
const getAdminAvailabilitySlots = async (req, res) => {
    const { dayOfWeek, isActive } = req.query;
    const conditions = [];
    if (dayOfWeek && typeof dayOfWeek === "string") {
        conditions.push((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.dayOfWeek, dayOfWeek));
    }
    if (isActive !== undefined && isActive !== "") {
        const activeBool = isActive === "true" || isActive === "1";
        conditions.push((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.isActive, activeBool));
    }
    const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
    const allSlots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where(whereClause)
        .orderBy((0, drizzle_orm_1.asc)(StudentAvailabilityPlan_1.adminAvailabilitySlots.dayOfWeek), (0, drizzle_orm_1.asc)(StudentAvailabilityPlan_1.adminAvailabilitySlots.timeFrom));
    const formatted = (0, exports.formatSlotsByDays)(allSlots);
    return (0, response_1.SuccessResponse)(res, {
        message: "Availability slots retrieved successfully",
        total: allSlots.length,
        days: formatted.days,
        grouped: formatted.grouped,
        slots: allSlots,
    });
};
exports.getAdminAvailabilitySlots = getAdminAvailabilitySlots;
// ── 2. Get Single Availability Slot by ID (Admin) ───────────────────────────
const getAdminAvailabilitySlotById = async (req, res) => {
    const { id } = req.params;
    const [slot] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id))
        .limit(1);
    if (!slot) {
        throw new Errors_1.NotFound("Availability slot not found");
    }
    return (0, response_1.SuccessResponse)(res, { slot });
};
exports.getAdminAvailabilitySlotById = getAdminAvailabilitySlotById;
// ── 3. Create Availability Slot(s) (Admin) ───────────────────────────────────
// Supports single slot: { dayOfWeek, timeFrom, timeTo }
// Or batch: { slots: [...] } or [...]
const createAdminAvailabilitySlot = async (req, res) => {
    const adminId = req.user?.id || null;
    let inputSlots = [];
    if (Array.isArray(req.body)) {
        inputSlots = req.body;
    }
    else if (Array.isArray(req.body.slots)) {
        inputSlots = req.body.slots;
    }
    else if (req.body.dayOfWeek && req.body.timeFrom && req.body.timeTo) {
        inputSlots = [req.body];
    }
    else {
        throw new Errors_1.BadRequest("Please provide slot details or an array of slots");
    }
    if (inputSlots.length === 0) {
        throw new Errors_1.BadRequest("At least one slot is required");
    }
    // Normalizing times and validating
    const createdSlotsToInsert = inputSlots.map((s) => ({
        id: (0, crypto_1.randomUUID)(),
        dayOfWeek: s.dayOfWeek,
        timeFrom: s.timeFrom.length === 5 ? `${s.timeFrom}:00` : s.timeFrom,
        timeTo: s.timeTo.length === 5 ? `${s.timeTo}:00` : s.timeTo,
        isActive: s.isActive !== undefined ? s.isActive : true,
        createdBy: adminId,
    }));
    await connection_1.db.insert(StudentAvailabilityPlan_1.adminAvailabilitySlots).values(createdSlotsToInsert);
    // Fetch newly created slots
    const insertedIds = createdSlotsToInsert.map((s) => s.id);
    const createdSlots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.and)(...[(0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, insertedIds[0])])); // safe query
    // Fetch all current slots for the updated view
    const allSlots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .orderBy((0, drizzle_orm_1.asc)(StudentAvailabilityPlan_1.adminAvailabilitySlots.dayOfWeek), (0, drizzle_orm_1.asc)(StudentAvailabilityPlan_1.adminAvailabilitySlots.timeFrom));
    const formatted = (0, exports.formatSlotsByDays)(allSlots);
    return (0, response_1.SuccessResponse)(res, {
        message: `${createdSlotsToInsert.length} availability slot(s) created successfully`,
        createdSlots: createdSlotsToInsert,
        days: formatted.days,
        grouped: formatted.grouped,
    }, 201);
};
exports.createAdminAvailabilitySlot = createAdminAvailabilitySlot;
// ── 4. Update Availability Slot (Admin) ─────────────────────────────────────
const updateAdminAvailabilitySlot = async (req, res) => {
    const { id } = req.params;
    const { dayOfWeek, timeFrom, timeTo, isActive } = req.body;
    const [existing] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id))
        .limit(1);
    if (!existing) {
        throw new Errors_1.NotFound("Availability slot not found");
    }
    const updateData = {};
    if (dayOfWeek !== undefined)
        updateData.dayOfWeek = dayOfWeek;
    if (timeFrom !== undefined)
        updateData.timeFrom = timeFrom.length === 5 ? `${timeFrom}:00` : timeFrom;
    if (timeTo !== undefined)
        updateData.timeTo = timeTo.length === 5 ? `${timeTo}:00` : timeTo;
    if (isActive !== undefined)
        updateData.isActive = isActive;
    await connection_1.db
        .update(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id));
    const [updatedSlot] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id));
    return (0, response_1.SuccessResponse)(res, {
        message: "Availability slot updated successfully",
        slot: updatedSlot,
    });
};
exports.updateAdminAvailabilitySlot = updateAdminAvailabilitySlot;
// ── 5. Toggle or Update Availability Slot Status (Admin) ─────────────────────
const updateAdminSlotStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const [existing] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id))
        .limit(1);
    if (!existing) {
        throw new Errors_1.NotFound("Availability slot not found");
    }
    const newStatus = isActive !== undefined ? isActive : !existing.isActive;
    await connection_1.db
        .update(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .set({ isActive: newStatus })
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id));
    const [updatedSlot] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id));
    return (0, response_1.SuccessResponse)(res, {
        message: `Availability slot status updated to ${newStatus ? "active" : "inactive"}`,
        slot: updatedSlot,
    });
};
exports.updateAdminSlotStatus = updateAdminSlotStatus;
// ── 6. Delete Availability Slot (Admin) ─────────────────────────────────────
const deleteAdminAvailabilitySlot = async (req, res) => {
    const { id } = req.params;
    const [existing] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id))
        .limit(1);
    if (!existing) {
        throw new Errors_1.NotFound("Availability slot not found");
    }
    await connection_1.db
        .delete(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, id));
    return (0, response_1.SuccessResponse)(res, {
        message: "Availability slot deleted successfully",
    });
};
exports.deleteAdminAvailabilitySlot = deleteAdminAvailabilitySlot;
