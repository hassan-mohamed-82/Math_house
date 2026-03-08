import { mysqlTable, varchar, char, timestamp, mysqlEnum, AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const driveFolders = mysqlTable("drive_folders", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    parentFolderId: char("parent_folder_id", { length: 255 }).references((): AnyMySqlColumn => driveFolders.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const driveAssets = mysqlTable("drive_assets", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    title: varchar("title", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["video", "pdf", "image", "audio", "document", "other"]).notNull().default("video"),
    status: mysqlEnum("status", ["uploading", "uploaded", "processing", "ready", "failed"]).notNull().default("uploading"),
    folderId: char("folder_id", { length: 255 }).references(() => driveFolders.id),
    bunnyGuid: varchar("bunny_guid", { length: 255 }).unique(),
    sourceUrl: varchar("source_url", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});