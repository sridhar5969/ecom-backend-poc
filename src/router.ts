import { Router } from 'express';

import healthRouter from './core/health-check';
import productsRouter from './core/products/controller';
import protect from './middleware/protect';

const router = Router();

// Pre-Auth Web Routes
router.use('/health', healthRouter);

// Post-Auth Web Routes
router.use(protect);
router.use('/products', productsRouter);

export default router;
