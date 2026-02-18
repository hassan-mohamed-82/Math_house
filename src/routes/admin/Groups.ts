import { Router } from "express";
import {
    createGroup, deleteGroup,
    getAllGroups, getGroupById, updateGroup, searchStudents, selectOptions
} from "../../controllers/admin/Groups";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/select", catchAsync(selectOptions));
router.get("/search-students", catchAsync(searchStudents));
router.get("/", catchAsync(getAllGroups));
router.get("/:id", catchAsync(getGroupById));
router.post("/", catchAsync(createGroup));
router.put("/:id", catchAsync(updateGroup));
router.delete("/:id", catchAsync(deleteGroup));

export default router;