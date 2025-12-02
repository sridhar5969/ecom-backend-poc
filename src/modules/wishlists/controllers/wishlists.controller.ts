import { Request, Response } from 'express';
import { WishlistsService } from '../services/wishlists.services';
import { createWishListSchema } from './validator';
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

	static async createWishList(req: Request, res: Response) {
		const parsed = createWishListSchema.parse(req.body);
		const userId = req.user_details.id;
		try {
			const result =
				await WishlistsController.WishListsService.createWishlist(
					userId,
					parsed,
				);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('CREATE_WISHLIST_ERROR', error);
			throw error;
		}
	}

	static async addItem(req: Request, res: Response) {
		// Validate Payload (variantId, note, priority)
		// const parsed = addItemSchema.parse(req.body);
		const userId = req.user_details.id;
		const { wishlistId } = req.params;

		try {
			const result = await WishlistsController.WishListsService.addItem(
				userId,
				wishlistId,
				req.body, // or parsed
			);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('ADD_WISHLIST_ITEM_ERROR', error);
			throw error;
		}
	}

	static async removeItem(req: Request, res: Response) {
		const userId = req.user_details.id;
		const { wishlistId, variantId } = req.params;

		try {
			const result =
				await WishlistsController.WishListsService.removeItem(
					userId,
					wishlistId,
					variantId,
				);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('REMOVE_WISHLIST_ITEM_ERROR', error);
			throw error;
		}
	}

	static async moveToCart(req: Request, res: Response) {
		const userId = req.user_details.id;
		const { wishlistId, variantId } = req.params;

		try {
			const result =
				await WishlistsController.WishListsService.moveToCart(
					userId,
					wishlistId,
					variantId,
				);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('MOVE_TO_CART_ERROR', error);
			throw error;
		}
	}

	static async shareWishlist(req: Request, res: Response) {
		const userId = req.user_details.id;
		const { wishlistId } = req.params;

		try {
			const result =
				await WishlistsController.WishListsService.generateShareLink(
					userId,
					wishlistId,
				);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('SHARE_WISHLIST_ERROR', error);
			throw error;
		}
	}

	static async getSharedWishlist(req: Request, res: Response) {
		const { token } = req.params;
		try {
			// Public Route: No userId check needed
			const result =
				await WishlistsController.WishListsService.getSharedWishlist(
					token,
				);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('GET_SHARED_WISHLIST_ERROR', error);
			throw error;
		}
	}
}
