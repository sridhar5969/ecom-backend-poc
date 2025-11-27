import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { KAFKA_TOPICS } from '@/core/kafka.config';
import { kafkaProducer } from '@/core/kafka.producer';
import { stripePaymentService } from '@/core/payment.service';
import { db } from '@/database';
import { orders, orderTransactions } from '@/database/schema';

const router = Router();

router.post('/payment/create-intent', async (req, res) => {
	try {
		const { orderId } = req.body;

		const [order] = await db
			.select()
			.from(orders)
			.where(eq(orders.id, orderId))
			.limit(1);

		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}

		const paymentIntent = await stripePaymentService.createPaymentIntent({
			amount: order.grandTotal,
			currency: order.currency.toLowerCase(),
			metadata: {
				orderId: order.id,
			},
		});

		await db
			.update(orders)
			.set({ paymentIntentId: paymentIntent.id })
			.where(eq(orders.id, orderId));

		await db.insert(orderTransactions).values({
			orderId: order.id,
			type: 'authorization',
			status: 'pending',
			amount: order.grandTotal,
			currency: order.currency,
			provider: 'stripe',
			providerTransactionId: paymentIntent.id,
		});

		res.json({
			clientSecret: paymentIntent.clientSecret,
			paymentIntentId: paymentIntent.id,
		});
	} catch (error) {
		console.error('Error creating payment intent:', error);
		res.status(500).json({ error: 'Failed to create payment intent' });
	}
});

router.post('/payment/confirm', async (req, res) => {
	try {
		const { orderId, paymentIntentId } = req.body;

		const capturedPayment =
			await stripePaymentService.capturePayment(paymentIntentId);

		await db
			.update(orders)
			.set({
				status: 'paid',
				paymentStatus: 'paid',
			})
			.where(eq(orders.id, orderId));

		await db.insert(orderTransactions).values({
			orderId,
			type: 'capture',
			status: 'success',
			amount: capturedPayment.amount,
			currency: capturedPayment.currency,
			provider: 'stripe',
			providerTransactionId: paymentIntentId,
		});

		await kafkaProducer.publish(KAFKA_TOPICS.PAYMENT_PROCESSED, {
			orderId,
			paymentIntentId,
			amount: capturedPayment.amount,
		});

		res.json({ success: true, order: { id: orderId, status: 'paid' } });
	} catch (error) {
		console.error('Error confirming payment:', error);

		await kafkaProducer.publish(KAFKA_TOPICS.PAYMENT_FAILED, {
			orderId: req.body.orderId,
			error: error instanceof Error ? error.message : 'Unknown error',
		});

		res.status(500).json({ error: 'Failed to confirm payment' });
	}
});

router.post('/payment/refund', async (req, res) => {
	try {
		const { orderId, amount, reason } = req.body;

		const [order] = await db
			.select()
			.from(orders)
			.where(eq(orders.id, orderId))
			.limit(1);

		if (!order || !order.paymentIntentId) {
			return res
				.status(404)
				.json({ error: 'Order or payment not found' });
		}

		const refund = await stripePaymentService.refundPayment({
			paymentIntentId: order.paymentIntentId,
			amount,
			reason,
		});

		await db
			.update(orders)
			.set({ status: 'refunded', paymentStatus: 'refunded' })
			.where(eq(orders.id, orderId));

		await db.insert(orderTransactions).values({
			orderId,
			type: 'refund',
			status: 'success',
			amount: amount || order.grandTotal,
			currency: order.currency,
			provider: 'stripe',
			providerTransactionId: refund.id,
		});

		res.json({ success: true, refund });
	} catch (error) {
		console.error('Error processing refund:', error);
		res.status(500).json({ error: 'Failed to process refund' });
	}
});

router.post('/payment/webhook', async (req, res) => {
	try {
		const signature = req.headers['stripe-signature'] as string;
		const payload = JSON.stringify(req.body);

		const isValid = await stripePaymentService.verifyWebhookSignature(
			payload,
			signature,
		);

		if (!isValid) {
			return res.status(400).json({ error: 'Invalid signature' });
		}

		const event = req.body;

		switch (event.type) {
			case 'payment_intent.succeeded':
				console.log('Payment succeeded:', event.data.object.id);
				break;
			case 'payment_intent.payment_failed':
				console.log('Payment failed:', event.data.object.id);
				break;
		}

		res.json({ received: true });
	} catch (error) {
		console.error('Error processing webhook:', error);
		res.status(500).json({ error: 'Webhook processing failed' });
	}
});

export default router;
