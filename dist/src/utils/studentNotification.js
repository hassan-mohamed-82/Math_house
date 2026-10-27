"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStudentNotification = void 0;
const connection_1 = require("../models/connection");
const Notfication_1 = require("../models/schema/admin/Notfication");
const uuid_1 = require("uuid");
const sendStudentNotification = async (studentId, message, materialLink) => {
    try {
        const notificationId = (0, uuid_1.v4)();
        await connection_1.db.insert(Notfication_1.notifications).values({
            id: notificationId,
            dateTime: new Date(),
            notification: message,
            materialLink: materialLink || null,
            sendToAll: false,
        });
        await connection_1.db.insert(Notfication_1.notificationStudents).values({
            id: (0, uuid_1.v4)(),
            notificationId,
            studentId,
            isRead: false,
        });
    }
    catch (err) {
        // Notification errors should not block the main transaction/operation
        console.error("Failed to send student notification:", err);
    }
};
exports.sendStudentNotification = sendStudentNotification;
