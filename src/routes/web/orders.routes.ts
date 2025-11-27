import { eq, desc } from 'drizzle-orm';
import { Router } from 'express';
import { KAFKA_TOPICS } from '@/core/kafka.config';
import { kafkaProducer } from '@/core/kafka.producer';
import { db } from '@/database';
import {
	orders,
	orderItems,
	orderTransactions,
	shippingRates,
} from '@/database/schema';

const router = Router();

router.post('/orders', async (req, res) => {
	try {
		const {
			userId,
			items,
			shippingAddress,
			billingAddress,
			fulfillmentType,
			currency = 'NGN',
		} = req.body;

		const subtotal = items.reduce(
			(sum: number, item: any) => sum + item.unitPrice * item.quantity,
			0,
		);

		const [shippingRate] = await db
			.select()
			.from(shippingRates)
			.where(eq(shippingRates.fulfillmentType, fulfillmentType))
			.limit(1);

		const shippingTotal = shippingRate?.baseRate || 0;
		const taxTotal = Math.floor(subtotal * 0.075);
		const grandTotal = subtotal + shippingTotal + taxTotal;

		const [order] = await db
			.insert(orders)
			.values({
				userId,
				currency,
				subtotal,
				taxTotal,
				discountTotal: 0,
				shippingTotal,
				grandTotal,
				status: 'pending',
				paymentStatus: 'pending',
				fulfillmentType,
				shippingAddress,
				billingAddress,
			})
			.returning();

		await db.insert(orderItems).values(
			items.map((item: any) => ({
				orderId: order.id,
				variantId: item.variantId,
				productName: item.productName,
				sku: item.sku,
				unitPriceAmount: item.unitPrice,
				currency,
				quantity: item.quantity,
				totalPriceAmount: item.unitPrice * item.quantity,
			})),
		);

		await kafkaProducer.publish(KAFKA_TOPICS.ORDER_CREATED, {
			orderId: order.id,
			userId,
			grandTotal,
		});

		res.status(201).json({ order });
	} catch (error) {
		console.error('Error creating order:', error);
		res.status(500).json({ error: 'Failed to create order' });
	}
});

router.get('/orders/:orderId', async (req, res) => {
	try {
		const { orderId } = req.params;

		const [order] = await db
			.select()
			.from(orders)
			.where(eq(orders.id, orderId))
			.limit(1);

		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}

		const items = await db
			.select()
			.from(orderItems)
			.where(eq(orderItems.orderId, orderId));

		const transactions = await db
			.select()
			.from(orderTransactions)
			.where(eq(orderTransactions.orderId, orderId))
			.orderBy(desc(orderTransactions.createdAt));

		// const tracking = await db
		//     .select()
		//     .from(orderTracking)
		//     .where(eq(orderTracking.orderId, orderId))
		//     .orderBy(desc(orderTracking.createdAt));

		res.json({
			order,
			items,
			transactions,
			tracking: [],
		});
	} catch (error) {
		console.error('Error fetching order:', error);
		res.status(500).json({ error: 'Failed to fetch order' });
	}
});

router.get('/shipping-rates', async (req, res) => {
	try {
		const rates = await db
			.select()
			.from(shippingRates)
			.where(eq(shippingRates.isActive, true));

		res.json({ data: rates });
	} catch (error) {
		console.error('Error fetching shipping rates:', error);
		res.status(500).json({ error: 'Failed to fetch shipping rates' });
	}
});

export default router;
