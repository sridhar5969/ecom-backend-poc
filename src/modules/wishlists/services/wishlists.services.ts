import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid'; // REAL uuid generator
import { CreateWishListPayload } from '../controllers/validator';
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	PayloadValidatorError,
} from '@/abstractions/AppError';
import { db } from '@/database';
import { productVariants, wishlistItems, wishlists } from '@/database/schema';
import { CartService } from '@/modules/cart/services/cart.service';

export class WishlistsService {
	constructor() {}
	private static readonly CartService = new CartService();

	// ------------------------------------
	// GET ALL USER WISHLISTS
	// ------------------------------------
	async getWishlists(userId: string) {
		if (!userId) {
			throw new PayloadValidatorError('User ID is required');
		}

		const userWishLists = await db.query.wishlists.findMany({
			where: eq(wishlists.userId, userId),
		});

		if (userWishLists.length === 0) {
			throw new NotFoundError('No wishlists found for this user');
		}

		return userWishLists;
	}

	// ------------------------------------
	// GET A SINGLE WISHLIST
	// ------------------------------------
	async getWishlist(userId: string, wishlistId: string) {
		if (!userId) {
			throw new PayloadValidatorError('User ID is required');
		}

		if (!wishlistId) {
			throw new PayloadValidatorError('Wishlist ID is required');
		}

		const wishlist = await db.query.wishlists.findFirst({
			where: eq(wishlists.id, wishlistId),
			with: {
				items: {
					with: {
						variant: { with: { product: true } },
					},
				},
			},
		});

		if (!wishlist) {
			throw new NotFoundError('Wishlist not found');
		}

		if (wishlist.userId !== userId) {
			throw new ForbiddenError('You cannot access this wishlist');
		}

		return wishlist;
	}

	// ------------------------------------
	// CREATE A WISHLIST
	// ------------------------------------

	async createWishlist(userId: string, payload: CreateWishListPayload) {
		const { name, isPublic } = payload;
		if (!userId) {
			throw new PayloadValidatorError('User ID is reqired');
		}

		const match = await db.query.wishlists.findFirst({
			where: eq(wishlists.name, name),
		});
		if (match) {
			throw new ConflictError(
				'A Wishlist with this name already exists.',
			);
		}

		const [newWishlist] = await db
			.insert(wishlists)
			.values({ userId, name, isPublic })
			.returning();
		return { newWishlist, message: 'Wishlist created succesfully' };
	}

	// ------------------------------------
	// ADD ITEM TO WISHLIST
	// ------------------------------------
	async addItem(
		userId: string,
		wishlistId: string,
		payload: { variantId: string; note?: string; priority?: number },
	) {
		// 1. Verify Ownership
		const wishlist = await this.getWishlist(userId, wishlistId);

		// 2. Check Product
		const variant = await db.query.productVariants.findFirst({
			where: eq(productVariants.id, payload.variantId),
		});
		if (!variant) throw new NotFoundError('Variant not found');

		// 3. Check for Duplicates
		const exists = await db.query.wishlistItems.findFirst({
			where: and(
				eq(wishlistItems.wishlistId, wishlistId),
				eq(wishlistItems.variantId, payload.variantId),
			),
		});

		if (exists) throw new ConflictError('Item already in this wishlist');

		// 4. Insert
		const [item] = await db
			.insert(wishlistItems)
			.values({
				wishlistId: wishlist.id,
				variantId: payload.variantId,
				note: payload.note,
				priority: payload.priority || 1,
				priceAtAddition: variant.priceAmount, // Snapshot for "Price Drop" alerts
			})
			.returning();

		return item;
	}

	// ------------------------------------
	// REMOVE ITEM FROM WISHLIST
	// ------------------------------------
	async removeItem(userId: string, wishlistId: string, variantId: string) {
		await this.getWishlist(userId, wishlistId); // Verify access

		const result = await db
			.delete(wishlistItems)
			.where(
				and(
					eq(wishlistItems.wishlistId, wishlistId),
					eq(wishlistItems.variantId, variantId),
				),
			)
			.returning();

		if (result.length === 0)
			throw new NotFoundError('Item not found in list');

		return { success: true, message: 'Item removed' };
	}

	// ------------------------------------
	// MOVE ITEM TO CART
	// ------------------------------------
	async moveToCart(userId: string, wishlistId: string, variantId: string) {
		// 1. Verify access
		await this.getWishlist(userId, wishlistId);

		// 2. Find Item
		const item = await db.query.wishlistItems.findFirst({
			where: and(
				eq(wishlistItems.wishlistId, wishlistId),
				eq(wishlistItems.variantId, variantId),
			),
		});
		if (!item) throw new NotFoundError('Item not found');

		// 3. Add to Cart (Reusing Cart Logic)
		// We assume 1 quantity when moving from wishlist
		await WishlistsService.CartService.addToCart(
			{ userId },
			{ variantId, quantity: 1 },
		);

		// 4. Remove from Wishlist
		await db.delete(wishlistItems).where(eq(wishlistItems.id, item.id));

		return { success: true, message: 'Moved to cart' };
	}

	// ------------------------------------
	// GENERATE SHARE TOKEN
	// ------------------------------------
	async generateShareLink(userId: string, wishlistId: string) {
		const _wishlist = await this.getWishlist(userId, wishlistId);

		// If not public, make it public implicitly? Or force user to set public first?
		// Let's generate token regardless, but frontend should handle the toggle.
		const token = uuidv4();

		const [updated] = await db
			.update(wishlists)
			.set({
				shareToken: token,
				isPublic: true, // Auto-enable public access
			})
			.where(eq(wishlists.id, wishlistId))
			.returning();

		return { shareToken: updated.shareToken, isPublic: updated.isPublic };
	}

	// ------------------------------------
	// GET PUBLIC WISHLIST (No User ID Req)
	// ------------------------------------
	async getSharedWishlist(token: string) {
		const wishlist = await db.query.wishlists.findFirst({
			where: and(
				eq(wishlists.shareToken, token),
				eq(wishlists.isPublic, true),
			),
			with: {
				items: {
					with: {
						variant: { with: { product: true } },
					},
				},
				user: {
					// Show who owns the list
					columns: { name: true },
				},
			},
		});

		if (!wishlist)
			throw new NotFoundError('Wishlist not found or is private');
		return wishlist;
	}
}
