import { relations } from 'drizzle-orm';
import {
	pgTable,
	varchar,
	uuid,
	timestamp,
	integer,
	bigint,
} from 'drizzle-orm/pg-core';
import { productVariants } from './products';
import { currencies } from './system';
import { users } from './users';

export const carts = pgTable('carts', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id),
	sessionId: varchar('session_id'),
	currency: varchar('currency').references(() => currencies.code),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at'),
});

export const cartItems = pgTable('cart_items', {
	id: uuid('id').defaultRandom().primaryKey(),
	cartId: uuid('cart_id').references(() => carts.id),
	variantId: uuid('variant_id').references(() => productVariants.id),
	quantity: integer('quantity'),
	priceSnapshotAmount: bigint('price_snapshot_amount', { mode: 'number' }),
	priceSnapshotCurrency: varchar('price_snapshot_currency'),
	addedAt: timestamp('added_at').defaultNow(),
});

// Relations
export const cartsRelations = relations(carts, ({ one, many }) => ({
	user: one(users, {
		fields: [carts.userId],
		references: [users.id],
	}),
	currencyRef: one(currencies, {
		fields: [carts.currency],
		references: [currencies.code],
	}),
	items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
	cart: one(carts, {
		fields: [cartItems.cartId],
		references: [carts.id],
	}),
	variant: one(productVariants, {
		fields: [cartItems.variantId],
		references: [productVariants.id],
	}),
}));
