import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {
	getWalletTransactions,
	initiateAutomaticWalletRecharge,
	rechargeWalletRequest,
} from "../../controllers/user/wallet";

const router = Router();

router.get("/transactions", catchAsync(getWalletTransactions));
router.post("/recharge", catchAsync(rechargeWalletRequest));
router.post("/recharge/automatic", catchAsync(initiateAutomaticWalletRecharge));

export default router;