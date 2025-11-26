import { relations } from 'drizzle-orm';
import {
    pgTable,
    varchar,
    uuid,
    boolean,
    text,
    timestamp,
    integer,
    bigint,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { orders } from './orders';
import { productVariants, categories, brands } from './products';
import { currencies } from './system';
import { loyaltyAdjustmentTypeEnum } from './_Enums';

export const promoCodes = pgTable('promo_codes', {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code').unique(),
    name: varchar('name'),
    description: text('description'),
    stackable: boolean('stackable').default(false),
    minOrderAmount: integer('min_order_amount'),
    maxUses: integer('max_uses'),
    maxUsesPerUser: integer('max_uses_per_user'),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

export const promoCodeRedemptions = pgTable('promo_code_redemptions', {
    id: uuid('id').defaultRandom().primaryKey(),
    promoId: uuid('promo_id').references(() => promoCodes.id),
    userId: uuid('user_id').references(() => users.id),
    orderId: uuid('order_id').references(() => orders.id),
    amountApplied: integer('amount_applied'),
    redeemedAt: timestamp('redeemed_at').defaultNow(),
});

export const promoRules = pgTable('promo_rules', {
    id: uuid('id').defaultRandom().primaryKey(),
    promoCodeId: uuid('promo_code_id').references(() => promoCodes.id),
    name: varchar('name'),
    description: text('description'),
    triggerType: varchar('trigger_type'),
    triggerVariantId: uuid('trigger_variant_id').references(() => productVariants.id),
    triggerCategoryId: uuid('trigger_category_id').references(() => categories.id),
    triggerBrandId: uuid('trigger_brand_id').references(() => brands.id),
    triggerQuantity: integer('trigger_quantity'),
    triggerAmount: integer('trigger_amount'),
    benefitType: varchar('benefit_type'),
    benefitVariantId: uuid('benefit_variant_id').references(() => productVariants.id),
    benefitCategoryId: uuid('benefit_category_id').references(() => categories.id),
    benefitBrandId: uuid('benefit_brand_id').references(() => brands.id),
    benefitValue: integer('benefit_value'),
    benefitQuantity: integer('benefit_quantity'),
    appliesOncePerOrder: boolean('applies_once_per_order').default(false),
    appliesPerUnit: boolean('applies_per_unit').default(false),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

export const promoRuleItems = pgTable('promo_rule_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    ruleId: uuid('rule_id').references(() => promoRules.id),
    variantId: uuid('variant_id').references(() => productVariants.id),
    categoryId: uuid('category_id').references(() => categories.id),
    brandId: uuid('brand_id').references(() => brands.id),
    itemRole: varchar('item_role'),
});

export const loyaltyBalances = pgTable('loyalty_balances', {
    userId: uuid('user_id').primaryKey().references(() => users.id),
    points: integer('points').default(0),
    lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
});

export const loyaltyTransactions = pgTable('loyalty_transactions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    orderId: uuid('order_id').references(() => orders.id),
    promoId: uuid('promo_id').references(() => promoCodes.id),
    type: loyaltyAdjustmentTypeEnum('type'),
    pointsAmount: integer('points_amount'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const loyaltyRedemptionRules = pgTable('loyalty_redemption_rules', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name'),
    pointsRequired: integer('points_required'),
    discountAmount: bigint('discount_amount', { mode: 'number' }),
    currency: varchar('currency').references(() => currencies.code),
    isActive: boolean('is_active').default(true),
    startAt: timestamp('start_at'),
    endAt: timestamp('end_at'),
});

// Relations
export const promoCodesRelations = relations(promoCodes, ({ many }) => ({
    redemptions: many(promoCodeRedemptions),
    rules: many(promoRules),
}));

export const promoCodeRedemptionsRelations = relations(promoCodeRedemptions, ({ one }) => ({
    promo: one(promoCodes, {
        fields: [promoCodeRedemptions.promoId],
        references: [promoCodes.id],
    }),
    user: one(users, {
        fields: [promoCodeRedemptions.userId],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [promoCodeRedemptions.orderId],
        references: [orders.id],
    }),
}));

export const promoRulesRelations = relations(promoRules, ({ one, many }) => ({
    promoCode: one(promoCodes, {
        fields: [promoRules.promoCodeId],
        references: [promoCodes.id],
    }),
    triggerVariant: one(productVariants, {
        fields: [promoRules.triggerVariantId],
        references: [productVariants.id],
    }),
    triggerCategory: one(categories, {
        fields: [promoRules.triggerCategoryId],
        references: [categories.id],
    }),
    triggerBrand: one(brands, {
        fields: [promoRules.triggerBrandId],
        references: [brands.id],
    }),
    benefitVariant: one(productVariants, {
        fields: [promoRules.benefitVariantId],
        references: [productVariants.id],
    }),
    benefitCategory: one(categories, {
        fields: [promoRules.benefitCategoryId],
        references: [categories.id],
    }),
    benefitBrand: one(brands, {
        fields: [promoRules.benefitBrandId],
        references: [brands.id],
    }),
    items: many(promoRuleItems),
}));

export const promoRuleItemsRelations = relations(promoRuleItems, ({ one }) => ({
    rule: one(promoRules, {
        fields: [promoRuleItems.ruleId],
        references: [promoRules.id],
    }),
    variant: one(productVariants, {
        fields: [promoRuleItems.variantId],
        references: [productVariants.id],
    }),
    category: one(categories, {
        fields: [promoRuleItems.categoryId],
        references: [categories.id],
    }),
    brand: one(brands, {
        fields: [promoRuleItems.brandId],
        references: [brands.id],
    }),
}));

export const loyaltyBalancesRelations = relations(loyaltyBalances, ({ one }) => ({
    user: one(users, {
        fields: [loyaltyBalances.userId],
        references: [users.id],
    }),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
    user: one(users, {
        fields: [loyaltyTransactions.userId],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [loyaltyTransactions.orderId],
        references: [orders.id],
    }),
    promo: one(promoCodes, {
        fields: [loyaltyTransactions.promoId],
        references: [promoCodes.id],
    }),
}));

export const loyaltyRedemptionRulesRelations = relations(loyaltyRedemptionRules, ({ one }) => ({
    currencyRef: one(currencies, {
        fields: [loyaltyRedemptionRules.currency],
        references: [currencies.code],
    }),
}));
