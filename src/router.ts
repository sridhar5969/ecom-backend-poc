import { Router } from 'express';

import protect from './middleware/protect';
import authRouter from './modules/auth/controller';
import brandsRouter from './modules/brands/controller';
import cartRouter from './modules/cart/controller';
import categoryRouter from './modules/category/controller';
import checkoutRouter from './modules/checkout/controller';
import healthRouter from './modules/health-check';
import paymentsRouter from './modules/payments/controller';
import productsRouter from './modules/products/controller';
import sessionRouter from './modules/session/controller';
import wishlistsRouter from './modules/wishlists/controllers';

const router = Router();

// Pre-Auth Web Routes
router.use('/health', healthRouter);

// Post-Auth Web Routes
// router.use(protect);
router.use('/products', productsRouter);
router.use('/cart', cartRouter);
router.use('/wishlists', wishlistsRouter);
router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/brands', brandsRouter);
router.use('/checkout', checkoutRouter);
router.use('/payments', paymentsRouter);
// router.use(protect);

router.use('/session', protect, sessionRouter);

export default router;
