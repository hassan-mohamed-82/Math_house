import { Router } from "express";
import adminRouter from './admin/index';
import userRouter from './user/index'
import driveRouter from '../drive/routes/index';
const route = Router();

route.use('/admin', adminRouter);
route.use('/user', userRouter);
route.use('/drive', driveRouter);


export default route;