import { relations } from 'drizzle-orm';
import {
	pgTable,
	varchar,
	uuid,
	timestamp,
	integer,
	bigint,
	jsonb,
	text,
	numeric,
	boolean,
} from 'drizzle-orm/pg-core';
import {
	orderStatusEnum,
	fulfillmentTypeEnum,
	transactionTypeEnum,
	transactionStatusEnum,
} from './_Enums';
import { stores } from './inventory';
import { productVariants } from './products';
import { currencies } from './system';
import { users } from './users';

export type ShippingAndBillingAddress = {
	city: string;
	line1: string;
	line2: string;
	phone: string;
	state: string;
	country: string;
	fullName: string;
	postalCode: string;
};

export const orders = pgTable('orders', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id),
	currency: varchar('currency').references(() => currencies.code),
	subtotal: integer('subtotal'),
	taxTotal: integer('tax_total'),
	discountTotal: integer('discount_total'),
	shippingTotal: integer('shipping_total'),
	grandTotal: integer('grand_total'),
	status: orderStatusEnum('status').default('pending'),
	paymentStatus: varchar('payment_status'),
	paymentIntentId: varchar('payment_intent_id'),
	fulfillmentType: fulfillmentTypeEnum('fulfillment_type'),
	storeId: uuid('store_id').references(() => stores.id),
	shippingAddress:
		jsonb('shipping_address').$type<ShippingAndBillingAddress>(),
	billingAddress: jsonb('billing_address').$type<ShippingAndBillingAddress>(),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at'),
});

export const shippingRates = pgTable('shipping_rates', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name'),
	fulfillmentType: fulfillmentTypeEnum('fulfillment_type').unique(),
	baseRate: integer('base_rate'),
	currency: varchar('currency').references(() => currencies.code),
	minOrderAmount: integer('min_order_amount'),
	maxOrderAmount: integer('max_order_amount'),
	estimatedDays: integer('estimated_days'),
	isActive: boolean('is_active').default(true),
});

export const orderItems = pgTable('order_items', {
	id: uuid('id').defaultRandom().primaryKey(),
	orderId: uuid('order_id').references(() => orders.id),
	variantId: uuid('variant_id').references(() => productVariants.id),
	productName: varchar('product_name'),
	sku: varchar('sku'),
	unitPriceAmount: bigint('unit_price_amount', { mode: 'number' }),
	currency: varchar('currency').references(() => currencies.code),
	quantity: integer('quantity'),
	totalPriceAmount: bigint('total_price_amount', { mode: 'number' }),
	weightKg: numeric('weight_kg', { precision: 10, scale: 3 }),
	metadata: jsonb('metadata'),
});

export const orderTransactions = pgTable('order_transactions', {
	id: uuid('id').defaultRandom().primaryKey(),
	orderId: uuid('order_id').references(() => orders.id),
	type: transactionTypeEnum('type'),
	status: transactionStatusEnum('status'),
	amount: bigint('amount', { mode: 'number' }),
	currency: varchar('currency').references(() => currencies.code),
	provider: varchar('provider').default('stripe'),
	providerTransactionId: varchar('provider_transaction_id'),
	parentTransactionId: uuid('parent_transaction_id'), // Self reference handled in relations or manually if needed
	paymentMethodDetails: jsonb('payment_method_details'),
	gatewayResponse: jsonb('gateway_response'),
	errorMessage: text('error_message'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at'),
});

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id],
	}),
	currencyRef: one(currencies, {
		fields: [orders.currency],
		references: [currencies.code],
	}),
	store: one(stores, {
		fields: [orders.storeId],
		references: [stores.id],
	}),
	items: many(orderItems),
	transactions: many(orderTransactions),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id],
	}),
	variant: one(productVariants, {
		fields: [orderItems.variantId],
		references: [productVariants.id],
	}),
	currencyRef: one(currencies, {
		fields: [orderItems.currency],
		references: [currencies.code],
	}),
}));

export const orderTransactionsRelations = relations(
	orderTransactions,
	({ one }) => ({
		order: one(orders, {
			fields: [orderTransactions.orderId],
			references: [orders.id],
		}),
		currencyRef: one(currencies, {
			fields: [orderTransactions.currency],
			references: [currencies.code],
		}),
		parentTransaction: one(orderTransactions, {
			fields: [orderTransactions.parentTransactionId],
			references: [orderTransactions.id],
			relationName: 'parent_child_transaction',
		}),
	}),
);
