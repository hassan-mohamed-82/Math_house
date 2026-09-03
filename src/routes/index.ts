import { Router } from "express";
import adminRouter from './admin/index';
import userRouter from './user/index'
import paymentRouter from './payment';
import driveRouter from '../drive/routes/index';
import teacherRouter from './teacher';
const route = Router();

route.use('/admin', adminRouter);
route.use('/teacher', teacherRouter);
route.use('/user', userRouter);
route.use('/payment', paymentRouter);
route.use('/drive', driveRouter);


export default route;