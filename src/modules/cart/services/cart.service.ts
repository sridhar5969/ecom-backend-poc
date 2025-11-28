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

		console.log(userId);
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
		console.log(
			`[Merge] Starting merge for User: ${userId}, GuestSession: ${guestSessionId}`,
		);

		// 1. Find the Guest Cart
		const guestCart = await db.query.carts.findFirst({
			where: eq(carts.sessionId, guestSessionId),
			with: { items: true }, // We need items to loop through them
		});

		if (!guestCart) {
			console.log('[Merge] No guest cart found. Skipping.');
			return { success: false, message: 'No guest cart found to merge' };
		}

		// 2. Find the User Cart
		const userCart = await db.query.carts.findFirst({
			where: eq(carts.userId, userId),
		});

		// SCENARIO B: User has NO cart. We simply claim the guest cart.
		// This is the fastest path.
		if (!userCart) {
			console.log('[Merge] User has no cart. Claiming guest cart.');
			await db
				.update(carts)
				.set({
					userId: userId,
					sessionId: null, // Clear session so it's strictly a user cart now
					updatedAt: new Date(),
				})
				.where(eq(carts.id, guestCart.id));

			return { success: true, message: 'Guest cart claimed' };
		}

		// SCENARIO A: User ALREADY has a cart. We must merge items.
		console.log(
			`[Merge] User has cart ${userCart.id}. Merging ${guestCart.items.length} items.`,
		);

		// Transaction safety recommended here, but we'll do linear logic for clarity
		for (const guestItem of guestCart.items) {
			// Check if user already has this specific variant
			const existingUserItem = await db.query.cartItems.findFirst({
				where: and(
					eq(cartItems.cartId, userCart.id),
					eq(cartItems.variantId, guestItem.variantId),
				),
			});

			if (existingUserItem) {
				// COLLISION: Update quantity (User qty + Guest qty)
				console.log(
					`[Merge] Item collision for variant ${guestItem.variantId}. Adding quantities.`,
				);
				await db
					.update(cartItems)
					.set({
						quantity:
							existingUserItem.quantity + guestItem.quantity,
					})
					.where(eq(cartItems.id, existingUserItem.id));

				// Delete the old guest item since we merged it
				await db
					.delete(cartItems)
					.where(eq(cartItems.id, guestItem.id));
			} else {
				// NO COLLISION: Move item to user cart
				console.log(
					`[Merge] Moving variant ${guestItem.variantId} to user cart.`,
				);
				await db
					.update(cartItems)
					.set({ cartId: userCart.id })
					.where(eq(cartItems.id, guestItem.id));
			}
		}

		// 3. Cleanup: Delete the now-empty guest cart
		console.log('[Merge] Deleting empty guest cart.');
		await db.delete(carts).where(eq(carts.id, guestCart.id));

		return { success: true, message: 'Carts merged successfully' };
	}
}
