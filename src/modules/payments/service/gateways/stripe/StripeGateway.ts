import Stripe from 'stripe';
import { IPaymentGateway } from '../IPaymentGateway';
import { BadRequestError } from '@/abstractions/AppError';
import {
	CreateSessionRequest,
	PaymentSession,
} from '@/modules/payments/types/payments';

type StripeConfig = {
	secretKey: string;
	webhookSecret?: string;
	successUrl: string;
	cancelUrl: string;
};

export class StripeGateway implements IPaymentGateway {
	id = 'stripe';
	private stripe: Stripe;
	private cfg: StripeConfig;

	constructor(cfg: StripeConfig) {
		this.cfg = cfg;
		this.stripe = new Stripe(cfg.secretKey, {
			apiVersion: '2025-02-24.acacia',
		});
	}

	async createSession(opts: CreateSessionRequest): Promise<PaymentSession> {
		try {
			const session = await this.stripe.checkout.sessions.create({
				// payment_method_types: ['card'],
				line_items: [
					{
						price_data: {
							currency: opts.currency || 'usd',
							product_data: {
								name: 'Order Payment',
								metadata: opts.metadata,
							},
							unit_amount: opts.amountKobo,
						},
						quantity: 1,
					},
				],
				mode: 'payment',
				success_url: this.cfg.successUrl,
				cancel_url: this.cfg.cancelUrl,
				client_reference_id: opts.paymentSession,
				metadata: opts.metadata,
			});

			return {
				paymentSession: session.id,
				amountKobo: session.amount_total || opts.amountKobo,
				status: 'pending',
				url: session.url || undefined,
				providerResponse: session,
				expiresAt: session.expires_at
					? new Date(session.expires_at * 1000).toISOString()
					: undefined,
			};
		} catch (error) {
			if (error instanceof Stripe.errors.StripeError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}

	async requerySession(paymentSession: string): Promise<PaymentSession> {
		const session =
			await this.stripe.checkout.sessions.retrieve(paymentSession);

		let status: PaymentSession['status'] = 'pending';
		if (session.payment_status === 'paid') {
			status = 'completed';
		} else if (session.status === 'expired') {
			status = 'expired';
		} else if (session.status === 'open') {
			status = 'pending';
		}

		return {
			paymentSession: session.id,
			status: status,
			amountKobo: session.amount_total || 0,
			url: session.url || undefined,
			providerResponse: session,
		};
	}

	async verifyWebhookPayload(
		headers: Record<string, string>,
		body: any,
	): Promise<{ valid: boolean; payload?: any }> {
		if (!this.cfg.webhookSecret) return { valid: false };

		const sig = headers['stripe-signature'];
		if (!sig) return { valid: false };

		try {
			// Note: body must be the raw request body buffer
			const event = this.stripe.webhooks.constructEvent(
				body,
				sig,
				this.cfg.webhookSecret,
			);

			return { valid: true, payload: event };
		} catch (e: unknown) {
			console.error('Stripe webhook verification error:', e);
			return { valid: false };
		}
	}
}
