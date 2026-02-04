import { db, pool } from "../models/connection";
import { seedRoles } from "./roles";
import { seedAdmins } from "./admins";

const runSeeds = async () => {
    try {
        console.log("Starting seeding process...");

        await seedRoles();
        await seedAdmins();

        console.log("Seeding completed successfully.");
    } catch (error) {
        console.error("Seeding failed:", error);
    } finally {
        await pool.end();
        console.log("Database connection closed.");
    }
};

runSeeds();
