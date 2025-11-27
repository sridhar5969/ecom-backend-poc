import { Router } from 'express';

import authRouter from './core/auth/controller';
import healthRouter from './core/health-check';
import productsRouter from './core/products/controller';
import sessionRouter from './core/session/controller';
import protect from './middleware/protect';

const router = Router();

// Pre-Auth Web Routes
router.use('/health', healthRouter);

// Post-Auth Web Routes
router.use('/products', productsRouter);
router.use('/auth', authRouter);
// router.use(protect);

router.use('/session', protect, sessionRouter);

export default router;
