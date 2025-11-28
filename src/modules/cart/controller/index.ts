import { Router } from 'express';
import { CartController } from './cart.controller';
import optionalAuth from '@/middleware/optionalAuth';
import protect from '@/middleware/protect';

const cartRouter = Router();

// We don't strictly require authMiddleware because guests can add to cart too
cartRouter.get('/', optionalAuth, CartController.getCart);
cartRouter.post('/items', optionalAuth, CartController.addToCart);
cartRouter.patch('/items/:variantId', optionalAuth, CartController.updateItem);
cartRouter.delete('/items/:variantId', optionalAuth, CartController.removeItem);

// Protected Route (Requires Login)
cartRouter.post('/merge', protect, CartController.mergeCart);

export default cartRouter;
