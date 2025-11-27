import { Router } from 'express';

import authRouter from './modules/auth/controller';
import healthRouter from './modules/health-check';
import productsRouter from './modules/products/controller';
import sessionRouter from './modules/session/controller';
import protect from './middleware/protect';

const router = Router();

// Pre-Auth Web Routes
router.use('/health', healthRouter);

// Post-Auth Web Routes
// router.use(protect);
router.use('/products', productsRouter);
router.use('/auth', authRouter);
// router.use(protect);

router.use('/session', protect, sessionRouter);

export default router;
