import { Router } from 'express';
import { WishlistsController } from './wishlists.controller';
import protect from '@/middleware/protect';

const wishlistsRouter = Router();

wishlistsRouter.get('/', protect, WishlistsController.getWishlists);
wishlistsRouter.get('/:wishlistId', protect, WishlistsController.getWishlist);

export default wishlistsRouter;
