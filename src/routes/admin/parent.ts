import { Router } from "express";
import { createParent, deleteParent, getAllParents, getParentById, updateParent,toggleParentStatus } from "../../controllers/admin/parent";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createParent));
router.get("/", catchAsync(getAllParents));
router.get("/:id", catchAsync(getParentById));
router.put("/:id", catchAsync(updateParent));
router.delete("/:id", catchAsync(deleteParent));
router.put("/:id/status", catchAsync(toggleParentStatus));

export default router;