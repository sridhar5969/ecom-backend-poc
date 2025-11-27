import { Router } from 'express';
import contentRouter from './content.routes';
import ordersRouter from './orders.routes';
import paymentRouter from './payment.routes';
import productsRouter from './products.routes';

export default function authRoutes(): Router {
	const router = Router();

	router.use('/api/v1', productsRouter);
	router.use('/api/v1', ordersRouter);
	router.use('/api/v1', paymentRouter);
	router.use('/api/v1', contentRouter);

	return router;
}
