import { seedRoles } from "./roles";
import { seedAdmins } from "./admins";
import { pool } from "../models/connection";

async function main() {
    try {
        console.log("Seeding database...");

        const roleId = await seedRoles();
        console.log(`Role ID: ${roleId}`);

        await seedAdmins(roleId);

        console.log("Seeding completed successfully.");
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
