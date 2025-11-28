import { InferSelectModel, relations } from 'drizzle-orm';
import {
	pgTable,
	varchar,
	uuid,
	boolean,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';
import { authMethodEnum, userRoleEnum } from './_Enums';

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	email: varchar('email').unique(),
	phoneNumber: varchar('phone_number').unique(),
	passwordHash: text('password_hash'),
	name: varchar('full_name'),
	role: userRoleEnum('role').default('customer'),
	isActive: boolean('is_active').default(true),
	primaryAuthMethod: authMethodEnum('primary_auth_method'),
	emailVerifiedAt: timestamp('email_verified_at'),
	phoneVerifiedAt: timestamp('phone_verified_at'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at'),
});

export const userSessions = pgTable('user_sessions', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id),
	sessionToken: text('session_token').unique(),
	expiresAt: timestamp('expires_at'),
	ipAddress: varchar('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').defaultNow(),
});

export const otpCodes = pgTable('otp_codes', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id),
	phoneNumber: varchar('phone_number'),
	email: varchar('email'),
	code: varchar('code'),
	type: varchar('type'),
	expiresAt: timestamp('expires_at'),
	isUsed: boolean('is_used').default(false),
	createdAt: timestamp('created_at').defaultNow(),
});

export const userAddresses = pgTable('user_addresses', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id),
	fullName: varchar('full_name'),
	phone: varchar('phone'),
	addressLine1: varchar('address_line1'),
	addressLine2: varchar('address_line2'),
	city: varchar('city'),
	state: varchar('state'),
	postalCode: varchar('postal_code'),
	country: varchar('country'),
	isDefault: boolean('is_default').default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(userSessions),
	otpCodes: many(otpCodes),
	addresses: many(userAddresses),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id],
	}),
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
	user: one(users, {
		fields: [otpCodes.userId],
		references: [users.id],
	}),
}));

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
	user: one(users, {
		fields: [userAddresses.userId],
		references: [users.id],
	}),
}));

export type User = InferSelectModel<typeof users>;
