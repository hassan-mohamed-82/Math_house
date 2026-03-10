import { Router } from 'express';
import { getPackages } from '../../controllers/user/packages';
import { catchAsync } from '../../utils/catchAsync';

const router = Router();
router.get('/', catchAsync(getPackages));

export default router;