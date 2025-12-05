import { eq } from 'drizzle-orm';
import { db } from '@/database';
import { orders, orderTransactions } from '@/database/schema';
import { PaymentRegistry } from '@/modules/payments/service/gateways/PaymentGatewayFactory';
import logger from '@/utils/logger/logger';

export class PaymentsService {
	async handleWebhook(
		provider: string,
		headers: Record<string, string>,
		body: any,
	) {
		const gateway = new PaymentRegistry().current();

		// Verify the gateway matches the provider in the URL if needed,
		// but for now we assume the webhook URL is specific to the provider or we check against the configured provider.
		if (gateway.id !== provider) {
			// In a multi-provider setup, we might want to look up the gateway by provider name.
			// For now, we'll just log a warning if they don't match, or we could instantiate the specific gateway.
			logger.warn(
				`Webhook received for ${provider} but current gateway is ${gateway.id}`,
			);
		}

		const verification = await gateway.verifyWebhookPayload(headers, body);

		if (!verification.valid) {
			throw new Error('Invalid webhook signature');
		}

		const payload = verification.payload;

		// Handle Stripe specific events
		if (provider === 'stripe') {
			await this.handleStripeEvent(payload);
		} else if (provider === 'traction') {
			await this.handleTractionEvent(payload);
		}

		return { received: true };
	}

	private async handleStripeEvent(event: any) {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object;
				const orderId = session.client_reference_id;

				if (orderId) {
					await this.updateOrderStatus(
						orderId,
						'paid',
						session.payment_intent,
					);
				}
				break;
			}
			case 'payment_intent.succeeded': {
				// Handle payment intent success if needed
				break;
			}
			// Add other event types as needed
		}
	}

	private async handleTractionEvent(payload: any) {
		// Implement Traction specific event handling
		// Based on TractionGateway implementation, payload might have payment_session
		const paymentSessionId = payload.payment_session;
		if (paymentSessionId) {
			// We need to find the order by payment session ID or similar
			// This part depends on how we stored the reference.
			// In checkout service we stored paymentIntentId = paymentSession.paymentSession

			const [order] = await db
				.select()
				.from(orders)
				.where(eq(orders.paymentIntentId, paymentSessionId))
				.limit(1);

			if (order) {
				// Check status from payload
				if (
					payload.status === 'success' ||
					payload.payment_status === 'received'
				) {
					await this.updateOrderStatus(order.id, 'paid', payload.id);
				}
			}
		}
	}

	private async updateOrderStatus(
		orderId: string,
		status: 'paid' | 'failed',
		transactionId?: string,
	) {
		await db.transaction(async (tx) => {
			// Update order status
			await tx
				.update(orders)
				.set({
					paymentStatus: status === 'paid' ? 'paid' : 'failed',
					status: status === 'paid' ? 'paid' : 'cancelled', // Or keep as pending/processing
					updatedAt: new Date(),
				})
				.where(eq(orders.id, orderId));

			// Record transaction
			if (transactionId) {
				await tx.insert(orderTransactions).values({
					orderId: orderId,
					type: 'payment',
					status: status === 'paid' ? 'success' : 'failed',
					amount: 0, // We might need to fetch the amount from the order or the event
					provider: 'stripe', // Should be dynamic
					providerTransactionId: transactionId,
					currency: 'USD', // Should be dynamic
				});
			}
		});
	}
}
