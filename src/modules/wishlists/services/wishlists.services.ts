import { eq } from 'drizzle-orm';
import AppError, {
	ForbiddenError,
	NotFoundError,
	PayloadValidatorError,
} from '@/abstractions/AppError';
import { db } from '@/database';
import { wishlists } from '@/database/schema/wishlists';

export class WishlistsService {
	constructor() {}

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
		});

		if (!wishlist) {
			throw new NotFoundError('Wishlist not found');
		}

		if (wishlist.userId !== userId) {
			throw new ForbiddenError('You cannot access this wishlist');
		}

		return wishlist;
	}
}
