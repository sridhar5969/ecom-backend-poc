import { Request, Response } from 'express';
import { CartCheckoutService } from '../service/checkout.service';
import { checkoutSchema } from './validator';
import { SuccessResponse } from '@/utils/apiResponse';
import logger from '@/utils/logger/logger';

export class CheckoutController {
	private static readonly checkoutService = new CartCheckoutService();

	static async checkoutController(req: Request, res: Response) {
		const task = 'CHECKOUT_PROCESS';
		try {
			const body = checkoutSchema.parse(req.body);

			const currentUser = {
				userId: req.user_details?.id,
				sessionId: req.headers['x-session-id'] as string,
			};

			const result =
				await CheckoutController.checkoutService.processCheckout(
					currentUser,
					body,
				);
			return new SuccessResponse(res, result).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			throw error;
		}
	}
}
