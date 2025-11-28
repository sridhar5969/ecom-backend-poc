import { relations } from 'drizzle-orm';
import {
	pgTable,
	varchar,
	uuid,
	timestamp,
	integer,
	boolean,
	bigint,
	unique,
} from 'drizzle-orm/pg-core';
import { productVariants } from './products';
import { users } from './users';

// 1. The Wishlist Container (Supports multiple lists per user)
export const wishlists = pgTable('wishlists', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),

	// User-friendly name (e.g., "Holiday Shopping")
	name: varchar('name').default('My Wishlist').notNull(),

	// Sharing Logic
	isPublic: boolean('is_public').default(false),
	shareToken: varchar('share_token').unique(), // Generates a link like /wishlist/share/xyz-123

	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. The Wishlist Items
export const wishlistItems = pgTable(
	'wishlist_items',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		wishlistId: uuid('wishlist_id')
			.references(() => wishlists.id, { onDelete: 'cascade' })
			.notNull(),
		variantId: uuid('variant_id')
			.references(() => productVariants.id, { onDelete: 'cascade' })
			.notNull(),

		// Optional: How badly do they want it? (1=Low, 3=High)
		priority: integer('priority').default(1),

		// Analytics Feature: Store price when added to calculate "Price Drop" alerts later
		priceAtAddition: bigint('price_at_addition', { mode: 'number' }),

		// Optional: User notes ("I want the blue one size L")
		note: varchar('note'),

		addedAt: timestamp('added_at').defaultNow(),
	},
	(t) => ({
		// Constraint: Can't have the same item twice in the SAME list
		unq: unique().on(t.wishlistId, t.variantId),
	}),
);

// --- RELATIONS ---

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
	user: one(users, {
		fields: [wishlists.userId],
		references: [users.id],
	}),
	items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
	wishlist: one(wishlists, {
		fields: [wishlistItems.wishlistId],
		references: [wishlists.id],
	}),
	variant: one(productVariants, {
		fields: [wishlistItems.variantId],
		references: [productVariants.id],
	}),
}));
