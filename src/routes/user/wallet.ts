import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getWalletTransactions, rechargeWalletRequest } from "../../controllers/user/wallet";

const router = Router();

router.get("/transactions", catchAsync(getWalletTransactions));
router.post("/recharge", catchAsync(rechargeWalletRequest));

export default router;