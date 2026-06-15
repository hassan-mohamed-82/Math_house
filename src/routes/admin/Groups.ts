import { Router } from "express";
import {
    createGroup, deleteGroup,
    getAllGroups, getGroupById, updateGroup, searchStudents, selectOptions
} from "../../controllers/admin/Groups";
import { catchAsync } from "../../utils/catchAsync";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.get("/select", catchAsync(selectOptions));
router.get("/search-students", requirePermission("groups", "View"), catchAsync(searchStudents));
router.get("/", requirePermission("groups", "View"), catchAsync(getAllGroups));
router.get("/:id", requirePermission("groups", "View"), catchAsync(getGroupById));
router.post("/", requirePermission("groups", "Add"), catchAsync(createGroup));
router.put("/:id", requirePermission("groups", "Edit"), catchAsync(updateGroup));
router.delete("/:id", requirePermission("groups", "Delete"), catchAsync(deleteGroup));

export default router;