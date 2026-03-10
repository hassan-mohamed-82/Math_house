import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
	getWalletTransactions,
	initiateAutomaticWalletRecharge,
	rechargeWalletRequest,
	getWalletBalance
} from "../../controllers/user/wallet";

const router = Router();

router.get("/transactions", catchAsync(getWalletTransactions));
router.post("/recharge", catchAsync(rechargeWalletRequest));
router.post("/recharge/automatic", catchAsync(initiateAutomaticWalletRecharge));
router.get("/balance", catchAsync(getWalletBalance));

export default router;