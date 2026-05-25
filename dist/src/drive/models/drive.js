"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driveAssets = exports.driveFolders = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.driveFolders = (0, mysql_core_1.mysqlTable)("drive_folders", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    parentFolderId: (0, mysql_core_1.char)("parent_folder_id", { length: 255 }).references(() => exports.driveFolders.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.driveAssets = (0, mysql_core_1.mysqlTable)("drive_assets", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["video", "pdf", "image", "audio", "document", "other"]).notNull().default("video"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["uploading", "uploaded", "processing", "ready", "failed"]).notNull().default("uploading"),
    folderId: (0, mysql_core_1.char)("folder_id", { length: 255 }).references(() => exports.driveFolders.id),
    bunnyGuid: (0, mysql_core_1.varchar)("bunny_guid", { length: 255 }).unique(),
    sourceUrl: (0, mysql_core_1.varchar)("source_url", { length: 500 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
