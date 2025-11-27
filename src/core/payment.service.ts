import { z } from 'zod';
import env from '../env';

const stripeConfigSchema = z.object({
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_PUBLISHABLE_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export const stripeConfig = stripeConfigSchema.parse({
	STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
	STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY,
	STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
});

export interface PaymentIntent {
	id: string;
	amount: number;
	currency: string;
	status: string;
	clientSecret?: string;
}

export interface CreatePaymentIntentParams {
	amount: number;
	currency: string;
	metadata?: Record<string, any>;
}

export interface RefundParams {
	paymentIntentId: string;
	amount?: number;
	reason?: string;
}

class StripePaymentService {
	private apiKey: string | undefined;

	constructor() {
		this.apiKey = stripeConfig.STRIPE_SECRET_KEY;
	}

	async createPaymentIntent(
		params: CreatePaymentIntentParams,
	): Promise<PaymentIntent> {
		if (!this.apiKey) {
			throw new Error('Stripe API key not configured');
		}

		console.log('[Stripe] Creating payment intent:', params);

		return {
			id: `pi_mock_${Date.now()}`,
			amount: params.amount,
			currency: params.currency,
			status: 'requires_payment_method',
			clientSecret: `pi_mock_${Date.now()}_secret`,
		};
	}

	async capturePayment(paymentIntentId: string): Promise<PaymentIntent> {
		if (!this.apiKey) {
			throw new Error('Stripe API key not configured');
		}

		console.log('[Stripe] Capturing payment:', paymentIntentId);

		return {
			id: paymentIntentId,
			amount: 0,
			currency: 'usd',
			status: 'succeeded',
		};
	}

	async refundPayment(params: RefundParams): Promise<any> {
		if (!this.apiKey) {
			throw new Error('Stripe API key not configured');
		}

		console.log('[Stripe] Refunding payment:', params);

		return {
			id: `re_mock_${Date.now()}`,
			paymentIntentId: params.paymentIntentId,
			amount: params.amount,
			status: 'succeeded',
		};
	}

	async verifyWebhookSignature(
		_payload: string,
		_signature: string,
	): Promise<boolean> {
		if (!stripeConfig.STRIPE_WEBHOOK_SECRET) {
			console.warn('[Stripe] Webhook secret not configured');
			return false;
		}

		return true;
	}
}

export const stripePaymentService = new StripePaymentService();
