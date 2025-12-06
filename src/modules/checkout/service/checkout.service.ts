import { eq } from 'drizzle-orm';
import { CheckoutPayloadType } from '../controller/validator';
import { BadRequestError } from '@/abstractions/AppError';
import { db } from '@/database';
import { carts, orders, orderItems, cartItems } from '@/database/schema';
import { PaymentRegistry } from '@/modules/payments/service/gateways/PaymentGatewayFactory';

export class CartCheckoutService {
	async processCheckout(
		currentUser: { userId?: string; sessionId?: string },
		payload: CheckoutPayloadType,
	) {
		const task = 'PROCESS_CHECKOUT';
		try {
			const billingAddress = payload.useShippingAsBilling
				? payload.shippingAddress
				: (payload.billingAddress ?? payload.shippingAddress);

			const where = currentUser?.userId
				? eq(carts.userId, currentUser.userId)
				: eq(carts.sessionId, currentUser.sessionId!);
			const cart = await db.query.carts.findFirst({
				where,
				with: {
					items: {
						with: {
							variant: {
								with: {
									product: true,
								},
							},
						},
					},
				},
			});

			if (!cart || !cart.items || cart.items.length === 0) {
				throw new BadRequestError('Cart is empty');
			}

			// Calculate totals
			let subtotal = 0;
			for (const item of cart.items) {
				const itemPrice = item.priceSnapshotAmount || 0;
				subtotal += itemPrice * item.quantity;
			}

			const shippingTotal = 0; // Free shipping for now
			const taxTotal = 0; // No tax calculation for now
			const discountTotal = 0; // No discounts for now
			const grandTotal =
				subtotal + shippingTotal + taxTotal - discountTotal;

			// Create order
			const [order] = await db
				.insert(orders)
				.values({
					userId: currentUser.userId,
					currency: cart.currency || 'NGN',
					subtotal,
					taxTotal,
					discountTotal,
					shippingTotal,
					grandTotal,
					status: 'pending',
					paymentStatus:
						payload.paymentMethod === 'cod'
							? 'pending'
							: 'awaiting_payment',
					fulfillmentType: 'delivery',
					shippingAddress: payload.shippingAddress as any,
					billingAddress: billingAddress as any,
					metadata: {
						paymentMethod: payload.paymentMethod,
						cartId: cart.id,
					},
				})
				.returning();

			// Create order items
			const orderItemsData = cart.items.map((item) => ({
				orderId: order.id,
				variantId: item.variantId,
				productName: item.variant?.product?.title || 'Unknown Product',
				sku: item.variant?.sku || '',
				unitPriceAmount: item.priceSnapshotAmount || 0,
				currency: cart.currency || 'USD',
				quantity: item.quantity,
				totalPriceAmount:
					(item.priceSnapshotAmount || 0) * item.quantity,
				metadata: {},
			}));

			await db.insert(orderItems).values(orderItemsData);

			// Handle payment based on method
			if (payload.paymentMethod === 'online') {
				// Create payment session
				const paymentGateway = new PaymentRegistry().current();
				const paymentSession = await paymentGateway.createSession({
					amountKobo: grandTotal, // Assuming amounts are already in smallest unit (cents/kobo)
					paymentSession: order.id,
					currency: order.currency || 'ngn',
					metadata: {
						orderId: order.id,
						userId: currentUser.userId,
						sessionId: currentUser.sessionId,
					},
				});

				// Update order with payment intent
				await db
					.update(orders)
					.set({
						paymentIntentId: paymentSession.paymentSession,
					})
					.where(eq(orders.id, order.id));

				return {
					orderId: order.id,
					status: 'pending',
					paymentMethod: 'online',
					paymentSession: {
						sessionId: paymentSession.paymentSession,
						accountNumber: paymentSession.accountNumber,
						accountName: paymentSession.accountName,
						bank: paymentSession.bank,
						amount: paymentSession.amountKobo,
						expiresAt: paymentSession.expiresAt,
						status: paymentSession.status,
						providerResponse: paymentSession.providerResponse,
						url: paymentSession.url,
					},
					message: 'Please complete payment to confirm your order',
				};
			}

			// clean up cart after order placement
			await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
			await db.delete(carts).where(eq(carts.id, cart.id));

			// Cash on Delivery
			return {
				orderId: order.id,
				status: 'confirmed',
				paymentMethod: 'cod',
				message: 'Order placed successfully. Pay on delivery.',
			};
		} catch (error) {
			console.error(`ERROR_${task}:`, error);
			throw error;
		}
	}
}
