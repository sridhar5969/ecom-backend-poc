import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { SuccessResponse } from '@/utils/apiResponse';
import logger from '@/utils/logger/logger';

export class CartController {
	private static readonly CartService = new CartService();

	// Helper to extract identity
	private static getIdentity(req: Request) {
		return {
			userId: (req as any).user?.id,
			sessionId: req.headers['x-session-id'] as string,
		};
	}

	static async addToCart(req: Request, res: Response) {
		try {
			const result = await CartController.CartService.addToCart(
				CartController.getIdentity(req),
				{ variantId: req.body.variantId, quantity: req.body.quantity },
			);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('ADD_TO_CART_ERROR', error);
			throw error;
		}
	}

	static async getCart(req: Request, res: Response) {
		try {
			const result = await CartController.CartService.getCartDetails(
				CartController.getIdentity(req),
			);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('GET_CART_ERROR', error);
			throw error;
		}
	}

	static async updateItem(req: Request, res: Response) {
		try {
			const result = await CartController.CartService.updateItem(
				CartController.getIdentity(req),
				{
					variantId: req.params.variantId,
					quantity: req.body.quantity,
				},
			);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('UPDATE_CART_ITEM_ERROR', error);
			throw error;
		}
	}

	static async removeItem(req: Request, res: Response) {
		try {
			const result = await CartController.CartService.removeItem(
				CartController.getIdentity(req),
				req.params.variantId,
			);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('REMOVE_CART_ITEM_ERROR', error);
			throw error;
		}
	}

	static async mergeCart(req: Request, res: Response) {
		try {
			const userId = (req as any).user?.id;
			const sessionId = req.headers['x-session-id'] as string;

			if (!userId || !sessionId) {
				throw new Error('Cannot merge: Missing User ID or Session ID');
			}

			const result = await CartController.CartService.mergeCarts(
				userId,
				sessionId,
			);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error('MERGE_CART_ERROR', error);
			throw error;
		}
	}
}
