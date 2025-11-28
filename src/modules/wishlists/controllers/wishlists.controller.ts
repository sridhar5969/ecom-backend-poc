import { Request, Response } from 'express';
import { WishlistsService } from '../services/wishlists.services';
import { SuccessResponse } from '@/utils/apiResponse';
import logger from '@/utils/logger/logger';

export class WishlistsController {
	private static readonly WishListsService = new WishlistsService();

	static async getWishlists(req: Request, res: Response) {
		const userId = req.user_details.id;

		try {
			const result =
				await WishlistsController.WishListsService.getWishlists(userId);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('GET_WISHLISTS_ERROR', error);
			throw error;
		}
	}

	static async getWishlist(req: Request, res: Response) {
		const userId = req.user_details.id;
		const wishlistId = req.params.wishlistId;

		try {
			const result =
				await WishlistsController.WishListsService.getWishlist(
					userId,
					wishlistId,
				);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('GET_WISHLIST_ERROR', error);
			throw error;
		}
	}
}
