import { mysqlTable, varchar, char, timestamp, datetime, text, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const popups = mysqlTable("popups", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    image: text("image").notNull(), // base64 photo
    destination: mysqlEnum("destination", ["student", "parent", "teacher"]).notNull(),
    startDate: datetime("start_date").notNull(),
    endDate: datetime("end_date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
