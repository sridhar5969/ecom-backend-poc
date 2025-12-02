import { Router } from 'express';
import { WishlistsController } from './wishlists.controller';
import optionalAuth from '@/middleware/optionalAuth';
import protect from '@/middleware/protect';

const wishlistsRouter = Router();

wishlistsRouter.get('/', protect, WishlistsController.getWishlists);
wishlistsRouter.get('/:wishlistId', protect, WishlistsController.getWishlist);
wishlistsRouter.post('/', protect, WishlistsController.createWishList);

wishlistsRouter.post(
	'/:wishlistId/items',
	protect,
	WishlistsController.addItem,
);
wishlistsRouter.delete(
	'/:wishlistId/items/:variantId',
	protect,
	WishlistsController.removeItem,
);
wishlistsRouter.post(
	'/:wishlistId/items/:variantId/move-to-cart',
	protect,

	WishlistsController.moveToCart,
);
wishlistsRouter.post(
	'/:wishlistId/share',
	protect,
	WishlistsController.shareWishlist,
);

// --- PUBLIC ROUTE for sharing wishlists ----
wishlistsRouter.get(
	'/shared/:token',
	optionalAuth,
	WishlistsController.getSharedWishlist,
);

export default wishlistsRouter;
