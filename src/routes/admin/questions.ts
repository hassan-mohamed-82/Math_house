import { Router } from "express";
import { getTextfromImage } from "../../controllers/admin/questions";
import { catchAsync } from "../../utils/catchAsync";
import { upload } from "../../middlewares/multer";

const router = Router();

router.post("/ocr", upload.single('image'), catchAsync(getTextfromImage));

export default router;