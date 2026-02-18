// routes/packages.routes.ts
import { Router } from "express";
import {
    selectOptions,
    getCoursesByCategory,
    createPackage,
    getAllPackages,
    getPackageById,
    updatePackage,
    deletePackage
} from "../../controllers/admin/Package";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

// Select Options
router.get("/select-options", catchAsync(selectOptions));
router.get("/courses/:categoryId", catchAsync(getCoursesByCategory));

// Packages CRUD
router.post("/", catchAsync(createPackage));
router.get("/", catchAsync(getAllPackages));
router.get("/:id", catchAsync(getPackageById));
router.put("/:id", catchAsync(updatePackage));
router.delete("/:id", catchAsync(deletePackage));

export default router;