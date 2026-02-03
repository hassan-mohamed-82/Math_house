import { Router } from 'express';
import orderRoutes from './order';
import usdtRoutes from './USDT';

const router = Router();

router.use('/order', orderRoutes);
router.use('/usdt', usdtRoutes);

export default router;