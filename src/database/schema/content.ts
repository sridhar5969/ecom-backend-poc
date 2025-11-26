import { relations } from 'drizzle-orm';
import {
    pgTable,
    varchar,
    uuid,
    boolean,
    text,
    timestamp,
    integer,
    jsonb,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { products, productVariants } from './products';
import { reviewStatusEnum } from './_Enums';

export const productReviews = pgTable('product_reviews', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id),
    userId: uuid('user_id').references(() => users.id),
    variantId: uuid('variant_id').references(() => productVariants.id),
    rating: integer('rating'),
    title: varchar('title'),
    content: text('content'),
    isVerifiedPurchase: boolean('is_verified_purchase').default(false),
    status: reviewStatusEnum('status').default('pending'),
    helpfulVotes: integer('helpful_votes').default(0),
    unhelpfulVotes: integer('unhelpful_votes').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
});

export const reviewImages = pgTable('review_images', {
    id: uuid('id').defaultRandom().primaryKey(),
    reviewId: uuid('review_id').references(() => productReviews.id),
    url: text('url'),
    isApproved: boolean('is_approved').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

export const wishlists = pgTable('wishlists', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    name: varchar('name').default('My Wishlist'),
    isPublic: boolean('is_public').default(false),
    shareToken: varchar('share_token').unique(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
});

export const wishlistItems = pgTable('wishlist_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    wishlistId: uuid('wishlist_id').references(() => wishlists.id),
    productId: uuid('product_id').references(() => products.id),
    variantId: uuid('variant_id').references(() => productVariants.id),
    addedAt: timestamp('added_at').defaultNow(),
    priority: integer('priority').default(0),
});

export const banner = pgTable('banner', {
    id: uuid('id').defaultRandom().primaryKey(),
    kicker: varchar('kicker'),
    heading: varchar('heading'),
    subHeading: varchar('sub_heading'),
    ctaText: varchar('cta_text'),
    ctaLink: varchar('cta_link'),
    backgroundColour: varchar('background_colour'),
    backgroundImage: varchar('background_image'),
    order: integer('order'),
    startAt: timestamp('start_at'),
    endAt: timestamp('end_at'),
});

export const searchIndexQueue = pgTable('search_index_queue', {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: varchar('entity_type'),
    entityId: uuid('entity_id'),
    operation: varchar('operation'),
    payload: jsonb('payload'),
    processed: boolean('processed').default(false),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const productReviewsRelations = relations(productReviews, ({ one, many }) => ({
    product: one(products, {
        fields: [productReviews.productId],
        references: [products.id],
    }),
    user: one(users, {
        fields: [productReviews.userId],
        references: [users.id],
    }),
    variant: one(productVariants, {
        fields: [productReviews.variantId],
        references: [productVariants.id],
    }),
    images: many(reviewImages),
}));

export const reviewImagesRelations = relations(reviewImages, ({ one }) => ({
    review: one(productReviews, {
        fields: [reviewImages.reviewId],
        references: [productReviews.id],
    }),
}));

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
    product: one(products, {
        fields: [wishlistItems.productId],
        references: [products.id],
    }),
    variant: one(productVariants, {
        fields: [wishlistItems.variantId],
        references: [productVariants.id],
    }),
}));
