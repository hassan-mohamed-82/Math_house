// routes/packages.routes.ts
import { Router } from "express";
import {
    selectOptions,
    getCoursesByCategory,
    selectionPackages,
    createPackage,
    getAllPackages,
    getPackageById,
    updatePackage,
    deletePackage
} from "../../controllers/admin/Package";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

// Select Options
router.get("/select", catchAsync(selectOptions));
router.get("/selection", catchAsync(selectionPackages));
router.get("/courses/:categoryId", catchAsync(getCoursesByCategory));


// Packages CRUD
router.post("/", requirePermission("packages", "Add"), catchAsync(createPackage));
router.get("/", requirePermission("packages", "View"), catchAsync(getAllPackages));
router.get("/:id", requirePermission("packages", "View"), catchAsync(getPackageById));
router.put("/:id", requirePermission("packages", "Edit"), catchAsync(updatePackage));
router.delete("/:id", requirePermission("packages", "Delete"), catchAsync(deletePackage));

export default router;