import { db } from "../models/connection";
import { notifications, notificationStudents } from "../models/schema/admin/Notfication";
import { v4 as uuidv4 } from "uuid";

export const sendStudentNotification = async (
    studentId: string,
    message: string,
    materialLink?: string | null
): Promise<void> => {
    try {
        const notificationId = uuidv4();

        await db.insert(notifications).values({
            id: notificationId,
            dateTime: new Date(),
            notification: message,
            materialLink: materialLink || null,
            sendToAll: false,
        });

        await db.insert(notificationStudents).values({
            id: uuidv4(),
            notificationId,
            studentId,
            isRead: false,
        });
    } catch (err) {
        // Notification errors should not block the main transaction/operation
        console.error("Failed to send student notification:", err);
    }
};
