"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePopups = exports.deletePopup = exports.updatePopup = exports.getPopupById = exports.getAllPopups = exports.createPopup = void 0;
const connection_1 = require("../../models/connection");
const Popup_1 = require("../../models/schema/admin/Popup");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const handleImages_1 = require("../../utils/handleImages");
const crypto_1 = require("crypto");
// ===================== CRUD =====================
const createPopup = async (req, res) => {
    const { name, image, destination, startDate, endDate } = req.body;
    if (!name || !image || !destination || !startDate || !endDate) {
        throw new BadRequest_1.BadRequest("Name, image, destination, start date and end date are required");
    }
    if (new Date(endDate) <= new Date(startDate)) {
        throw new BadRequest_1.BadRequest("End date must be after start date");
    }
    const imageURL = await (0, handleImages_1.validateAndSaveLogo)(req, image, "popups");
    await connection_1.db.insert(Popup_1.popups).values({
        id: (0, crypto_1.randomUUID)(),
        name,
        image: imageURL,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
    });
    return (0, response_1.SuccessResponse)(res, { message: "Popup created successfully" }, 201);
};
exports.createPopup = createPopup;
const getAllPopups = async (req, res) => {
    const allPopups = await connection_1.db.select().from(Popup_1.popups);
    const now = new Date();
    const result = allPopups.map(p => ({
        ...p,
        isActive: new Date(p.endDate) >= now && new Date(p.startDate) <= now,
    }));
    return (0, response_1.SuccessResponse)(res, { popups: result }, 200);
};
exports.getAllPopups = getAllPopups;
const getPopupById = async (req, res) => {
    const { id } = req.params;
    const popup = await connection_1.db.select().from(Popup_1.popups).where((0, drizzle_orm_1.eq)(Popup_1.popups.id, id));
    if (popup.length === 0) {
        throw new Errors_1.NotFound("Popup not found");
    }
    const now = new Date();
    const result = {
        ...popup[0],
        isActive: new Date(popup[0].endDate) >= now && new Date(popup[0].startDate) <= now,
    };
    return (0, response_1.SuccessResponse)(res, { popup: result }, 200);
};
exports.getPopupById = getPopupById;
const updatePopup = async (req, res) => {
    const { id } = req.params;
    const { name, image, destination, startDate, endDate } = req.body;
    const existing = await connection_1.db.select().from(Popup_1.popups).where((0, drizzle_orm_1.eq)(Popup_1.popups.id, id));
    if (existing.length === 0) {
        throw new Errors_1.NotFound("Popup not found");
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        throw new BadRequest_1.BadRequest("End date must be after start date");
    }
    const imageURL = await (0, handleImages_1.handleImageUpdate)(req, existing[0].image, image, "popups");
    await connection_1.db.update(Popup_1.popups).set({
        ...(name && { name }),
        ...(imageURL && { image: imageURL }),
        ...(destination && { destination }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
    }).where((0, drizzle_orm_1.eq)(Popup_1.popups.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Popup updated successfully" }, 200);
};
exports.updatePopup = updatePopup;
const deletePopup = async (req, res) => {
    const { id } = req.params;
    const existing = await connection_1.db.select().from(Popup_1.popups).where((0, drizzle_orm_1.eq)(Popup_1.popups.id, id));
    if (existing.length === 0) {
        throw new Errors_1.NotFound("Popup not found");
    }
    if (existing[0].image) {
        await (0, handleImages_1.deleteImage)(existing[0].image);
    }
    await connection_1.db.delete(Popup_1.popups).where((0, drizzle_orm_1.eq)(Popup_1.popups.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Popup deleted successfully" }, 200);
};
exports.deletePopup = deletePopup;
// ===================== USER-FACING =====================
// Returns only active popups for a given destination (student/parent/teacher)
const getActivePopups = async (req, res) => {
    const { destination } = req.query;
    if (!destination) {
        throw new BadRequest_1.BadRequest("Destination is required (student, parent, teacher)");
    }
    const now = new Date();
    const activePopups = await connection_1.db
        .select()
        .from(Popup_1.popups)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Popup_1.popups.destination, destination), (0, drizzle_orm_1.lte)(Popup_1.popups.startDate, now), (0, drizzle_orm_1.gte)(Popup_1.popups.endDate, now)));
    return (0, response_1.SuccessResponse)(res, { popups: activePopups }, 200);
};
exports.getActivePopups = getActivePopups;
