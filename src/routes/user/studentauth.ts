import express from "express";
import { catchAsync } from "../../utils/catchAsync";
import { studentLogin, studentSignup } from "../../controllers/user/studentauth";
import { selectcategoryandgrade } from "../../controllers/user/studentauth";
const router = express.Router();
router.post("/signup", catchAsync(studentSignup));
router.post("/login", catchAsync(studentLogin));
router.get("/select", catchAsync(selectcategoryandgrade));
export default router;
