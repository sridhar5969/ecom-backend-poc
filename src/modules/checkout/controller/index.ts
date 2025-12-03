import { Router } from 'express';
import { CheckoutController } from './controller';
import protect from '@/middleware/protect';

const checkoutRouter = Router();

checkoutRouter.post('/', protect, CheckoutController.checkoutController);

export default checkoutRouter;
