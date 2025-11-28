import { Router } from 'express';
import { CartController } from './cart.controller';
import protect from '@/middleware/protect';
// import { authMiddleware } from '@/middleware/auth'; // Optional: Use if you want to force login, but for cart usually we allow guests

const cartRouter = Router();

// We don't strictly require authMiddleware because guests can add to cart too
cartRouter.get('/', CartController.getCart);
cartRouter.post('/items', CartController.addToCart);
cartRouter.patch('/items/:variantId', CartController.updateItem);
cartRouter.delete('/items/:variantId', CartController.removeItem);

// Protected Route (Requires Login)
cartRouter.post('/merge', protect, CartController.mergeCart);

export default cartRouter;
