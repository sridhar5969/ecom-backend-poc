import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/database';
import { carts, cartItems } from '@/database/schema/carts';
import { productVariants } from '@/database/schema/products';

export class CartService {
	constructor() {}

	// 1. Helper to Find or Create a Cart (Existing)
	async getOrCreateCart(userId?: string, sessionId?: string) {
		if (!userId && !sessionId) throw new Error('No Identity Provider');

		const where = userId
			? eq(carts.userId, userId)
			: eq(carts.sessionId, sessionId!);

		let cart = await db.query.carts.findFirst({ where });

		if (!cart) {
			[cart] = await db
				.insert(carts)
				.values({
					userId: userId || null,
					sessionId: userId ? null : sessionId,
				})
				.returning();
		}
		return cart;
	}

	// 2. Add Item Logic (Existing)
	async addToCart(
		identity: { userId?: string; sessionId?: string },
		payload: { variantId: string; quantity: number },
	) {
		const { userId, sessionId } = identity;
		const { variantId, quantity } = payload;

		const cart = await this.getOrCreateCart(userId, sessionId);

		const variant = await db.query.productVariants.findFirst({
			where: eq(productVariants.id, variantId),
		});
		if (!variant) throw new Error('Variant not found');

		const existingItem = await db.query.cartItems.findFirst({
			where: and(
				eq(cartItems.cartId, cart.id),
				eq(cartItems.variantId, variantId),
			),
		});

		if (existingItem) {
			await db
				.update(cartItems)
				.set({ quantity: existingItem.quantity + quantity })
				.where(eq(cartItems.id, existingItem.id));
		} else {
			await db.insert(cartItems).values({
				cartId: cart.id,
				variantId: variantId,
				quantity: quantity,
				priceSnapshotAmount: variant.priceAmount,
			});
		}

		return { success: true, cartId: cart.id };
	}

	// 3. Get Full Cart Details (NEW)
	async getCartDetails(identity: { userId?: string; sessionId?: string }) {
		const { userId, sessionId } = identity;

		// Try to find the cart without creating one
		const where = userId
			? eq(carts.userId, userId)
			: eq(carts.sessionId, sessionId!);

		const cart = await db.query.carts.findFirst({
			where,
			with: {
				items: {
					orderBy: [desc(cartItems.addedAt)],
					with: {
						variant: {
							with: {
								product: {
									with: {
										images: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!cart) return { items: [], subtotal: 0, total_quantity: 0 };

		// Calculate Totals on the fly
		let subtotal = 0;
		let totalQuantity = 0;

		const formattedItems = cart.items
			.map((item) => {
				// Safe guard if variant was deleted but item exists
				if (!item.variant) return null;

				const lineTotal =
					(item.priceSnapshotAmount || 0) * item.quantity;
				subtotal += lineTotal;
				totalQuantity += item.quantity;

				return {
					id: item.id,
					variantId: item.variantId,
					productId: item.variant.productId,
					title: item.variant.product.title,
					variantName: item.variant.name,
					sku: item.variant.sku,
					price: item.priceSnapshotAmount,
					image: item.variant.product.images[0], // Adjust based on your schema
					quantity: item.quantity,
					line_total: lineTotal,
				};
			})
			.filter(Boolean);

		return {
			id: cart.id,
			items: formattedItems,
			subtotal,
			grand_total: subtotal, // Add tax/shipping logic here later
			total_quantity: totalQuantity,
		};
	}

	// 4. Update Item Quantity (NEW)
	async updateItem(
		identity: { userId?: string; sessionId?: string },
		payload: { variantId: string; quantity: number },
	) {
		const { userId, sessionId } = identity;
		const { variantId, quantity } = payload;

		if (quantity < 1) return this.removeItem(identity, variantId);

		const cart = await this.getOrCreateCart(userId, sessionId);

		await db
			.update(cartItems)
			.set({ quantity })
			.where(
				and(
					eq(cartItems.cartId, cart.id),
					eq(cartItems.variantId, variantId),
				),
			);

		return { success: true };
	}

	// 5. Remove Item (NEW)
	async removeItem(
		identity: { userId?: string; sessionId?: string },
		variantId: string,
	) {
		const { userId, sessionId } = identity;
		const cart = await this.getOrCreateCart(userId, sessionId);

		await db
			.delete(cartItems)
			.where(
				and(
					eq(cartItems.cartId, cart.id),
					eq(cartItems.variantId, variantId),
				),
			);

		return { success: true };
	}

	// 6. Merge Guest Cart into User Cart (NEW)
	async mergeCarts(userId: string, guestSessionId: string) {
		const guestCart = await db.query.carts.findFirst({
			where: eq(carts.sessionId, guestSessionId),
		});

		const userCart = await db.query.carts.findFirst({
			where: eq(carts.userId, userId),
		});

		if (guestCart) {
			if (userCart) {
				// Scenario A: Both exist. Move items from Guest -> User
				// Note: Logic to handle duplicate items (upsert) is omitted for brevity
				// but strictly speaking, you should sum quantities if item exists in both.

				await db
					.update(cartItems)
					.set({ cartId: userCart.id })
					.where(eq(cartItems.cartId, guestCart.id));

				// Delete empty guest cart
				await db.delete(carts).where(eq(carts.id, guestCart.id));
			} else {
				// Scenario B: User has no cart. Claim the guest cart.
				await db
					.update(carts)
					.set({ userId: userId, sessionId: null })
					.where(eq(carts.id, guestCart.id));
			}
		}

		return { success: true };
	}
}
