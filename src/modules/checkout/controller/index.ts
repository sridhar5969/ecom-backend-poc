import { Router } from 'express';
import { CheckoutController } from './controller';

const checkoutRouter = Router();

checkoutRouter.post('/', CheckoutController.checkoutController);

export default checkoutRouter;
