import { relations } from 'drizzle-orm';
import {
	pgTable,
	varchar,
	uuid,
	boolean,
	timestamp,
	integer,
	numeric,
	primaryKey,
} from 'drizzle-orm/pg-core';
import { discountTypeEnum } from './_Enums';
import { carts } from './carts';
import { productVariants } from './products';

export const stores = pgTable('stores', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name'),
	addressLine1: varchar('address_line1'),
	addressLine2: varchar('address_line2'),
	city: varchar('city'),
	state: varchar('state'),
	postalCode: varchar('postal_code'),
	country: varchar('country'),
	latitude: numeric('latitude', { precision: 10, scale: 8 }),
	longitude: numeric('longitude', { precision: 11, scale: 8 }),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at'),
});

export const inventoryLevels = pgTable(
	'inventory_levels',
	{
		variantId: uuid('variant_id').references(() => productVariants.id),
		storeId: uuid('store_id').references(() => stores.id),
		stock: integer('stock').default(0),
		reservedStock: integer('reserved_stock').default(0),
		lastAdjustedAt: timestamp('last_adjusted_at'),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.variantId, t.storeId] }),
	}),
);

export const stockReservations = pgTable('stock_reservations', {
	id: uuid('id').defaultRandom().primaryKey(),
	variantId: uuid('variant_id').references(() => productVariants.id),
	cartId: uuid('cart_id').references(() => carts.id),
	quantity: integer('quantity'),
	reservedAt: timestamp('reserved_at').defaultNow(),
	expiresAt: timestamp('expires_at'),
	createdBySession: varchar('created_by_session'),
});

export const volumeDiscounts = pgTable('volume_discounts', {
	id: uuid('id').defaultRandom().primaryKey(),
	variantId: uuid('variant_id').references(() => productVariants.id),
	minQuantity: integer('min_quantity'),
	discountType: discountTypeEnum('discount_type'),
	discountValue: integer('discount_value'),
	message: varchar('message'),
	startsAt: timestamp('starts_at'),
	endsAt: timestamp('ends_at'),
});

// Relations
export const storesRelations = relations(stores, ({ many }) => ({
	inventoryLevels: many(inventoryLevels),
}));

export const inventoryLevelsRelations = relations(
	inventoryLevels,
	({ one }) => ({
		variant: one(productVariants, {
			fields: [inventoryLevels.variantId],
			references: [productVariants.id],
		}),
		store: one(stores, {
			fields: [inventoryLevels.storeId],
			references: [stores.id],
		}),
	}),
);

export const stockReservationsRelations = relations(
	stockReservations,
	({ one }) => ({
		variant: one(productVariants, {
			fields: [stockReservations.variantId],
			references: [productVariants.id],
		}),
		cart: one(carts, {
			fields: [stockReservations.cartId],
			references: [carts.id],
		}),
	}),
);

export const volumeDiscountsRelations = relations(
	volumeDiscounts,
	({ one }) => ({
		variant: one(productVariants, {
			fields: [volumeDiscounts.variantId],
			references: [productVariants.id],
		}),
	}),
);
