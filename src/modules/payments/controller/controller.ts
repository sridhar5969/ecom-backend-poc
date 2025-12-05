import { Request, Response } from 'express';
import { PaymentsService } from '../service/payments.service';
import { SuccessResponse } from '@/utils/apiResponse';
import logger from '@/utils/logger/logger';

export class PaymentsController {
	private static readonly paymentsService = new PaymentsService();

	static async handleWebhook(req: Request, res: Response) {
		const provider = req.params.provider;
		const task = `WEBHOOK_${provider.toUpperCase()}`;

		try {
			// For Stripe, we need the raw body buffer for signature verification.
			// Ensure your express app is configured to preserve raw body for this route if needed,
			// or if using body-parser, verify it's available.
			// Here we assume req.body is what we need or we might need to adjust based on middleware.

			await PaymentsController.paymentsService.handleWebhook(
				provider,
				req.headers as Record<string, string>,
				(req as any).rawBody || req.body,
			);

			return new SuccessResponse(res, { received: true }).send();
		} catch (error) {
			logger.error(`ERROR_${task}`, { error });
			// Return 400 for invalid signature or other errors so provider knows to retry or stop
			res.status(400).send(
				`Webhook Error: ${error instanceof Error ? error.message : 'Unknown Error'}`,
			);
		}
	}
}
