import { Router } from "express";
import {
    createSession, getAllSessions, getSessionById, updateSession, deleteSession,
    selectOptions,
    getGroupUsers, searchUsers,
} from "../../controllers/admin/Session";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// Select dropdowns
router.get("/select", catchAsync(selectOptions));

// Users
router.get("/:groupId", catchAsync(getGroupUsers));
router.get("/search-users", catchAsync(searchUsers));

// Sessions CRUD
router.get("/", catchAsync(getAllSessions));
router.get("/:id", catchAsync(getSessionById));
router.post("/", catchAsync(createSession));
router.put("/:id", catchAsync(updateSession));
router.delete("/:id", catchAsync(deleteSession));

export default router;
