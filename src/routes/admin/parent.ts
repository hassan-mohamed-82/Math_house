import { Router } from "express";
import { createParent, deleteParent, getAllParents, getParentById, updateParent,toggleParentStatus } from "../../controllers/admin/parent";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", requirePermission("parents", "Add"), catchAsync(createParent));
router.get("/", requirePermission("parents", "View"), catchAsync(getAllParents));
router.get("/:id", requirePermission("parents", "View"), catchAsync(getParentById));
router.put("/:id", requirePermission("parents", "Edit"), catchAsync(updateParent));
router.delete("/:id", requirePermission("parents", "Delete"), catchAsync(deleteParent));
router.put("/:id/status", requirePermission("parents", "Status"), catchAsync(toggleParentStatus));

export default router;