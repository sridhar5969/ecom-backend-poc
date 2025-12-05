import { pgEnum } from 'drizzle-orm/pg-core';

export const productTypeEnum = pgEnum('product_type', ['simple', 'bundle']);

export const orderStatusEnum = pgEnum('order_status', [
	'pending',
	'paid',
	'processing',
	'ready_for_pickup',
	'shipped',
	'delivered',
	'cancelled',
	'refunded',
]);

export const fulfillmentTypeEnum = pgEnum('fulfillment_type', [
	'delivery',
	'express_delivery',
	'same_day_delivery',
	'self_pickup',
]);

export const discountTypeEnum = pgEnum('discount_type', [
	'percentage',
	'fixed_amount',
]);

export const userRoleEnum = pgEnum('user_role', [
	'admin',
	'manager',
	'customer',
]);
export type UserRole = (typeof userRoleEnum.enumValues)[number]; // Result: "admin" | "manager" | "customer"
export const authMethodEnum = pgEnum('auth_method', [
	'email_password',
	'phone_otp',
]);

export const loyaltyAdjustmentTypeEnum = pgEnum('loyalty_adjustment_type', [
	'earn_purchase',
	'redeem_discount',
	'admin_add',
	'admin_remove',
	'expire',
	'refund_reversal',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
	'authorization',
	'capture',
	'sale',
	'refund',
	'void',
	'dispute',
	'payment',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
	'pending',
	'success',
	'failed',
	'error',
	'cancelled',
]);

export const reviewStatusEnum = pgEnum('review_status', [
	'pending',
	'approved',
	'rejected',
	'flagged',
]);
