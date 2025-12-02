import { relations } from 'drizzle-orm';
import {
	pgTable,
	varchar,
	uuid,
	boolean,
	text,
	timestamp,
	jsonb,
	bigint,
	integer,
	numeric,
	primaryKey,
} from 'drizzle-orm/pg-core';
import { productTypeEnum } from './_Enums';
import { currencies } from './system';

export const brands = pgTable('brands', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name'),
	description: text('description'),
	attributes: jsonb('attributes')
		.$type<{
			theme_color?: string;
			banner_image?: string;
		}>()
		.default({}),
	slug: varchar('slug').unique(),
	logoUrl: text('logo_url'),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at'),
});

export const categories = pgTable('categories', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name'),
	slug: varchar('slug').unique(),
	parentId: uuid('parent_id'),
	createdAt: timestamp('created_at'),
});
type ProductMetadata = {
	displayStock?: number;
	materialCode?: string;
	baseUnit?: string;
	materialType?: string;
	abcIndicators?: string[];
	currencies?: string[];
	mrpTypes?: string[];
	purchasingGroups?: string[];
	priceUnits?: number[];
	lastSyncedAt?: string;
	avg_rating?: number;
	total_ratings?: number;
	default_image_url?: string | null;
	lowest_price_amount?: number;
	currency?: string;
	lowest_compare_at_amount?: number | null;
};
type ProductFlags = {
	isFeatured?: boolean;
	isOnSale?: boolean;
};
export const products = pgTable('products', {
	id: uuid('id').defaultRandom().primaryKey(),
	brandId: uuid('brand_id').references(() => brands.id),
	canonicalCategoryId: uuid('canonical_category_id').references(
		() => categories.id,
	),
	title: varchar('title'),
	flags: jsonb('flags')
		.$type<ProductFlags>()
		.$default(() => ({
			isFeatured: false,
			isOnSale: false,
		})),
	metadata: jsonb('metadata').default({}).$type<ProductMetadata>(),
	slug: varchar('slug').unique(),
	description: text('description'),
	type: productTypeEnum('type').default('simple'),
	status: varchar('status').default('draft'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at'),
});

export const productCategories = pgTable(
	'product_categories',
	{
		productId: uuid('product_id').references(() => products.id),
		categoryId: uuid('category_id').references(() => categories.id),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.productId, t.categoryId] }),
	}),
);

export const productImages = pgTable('product_images', {
	id: uuid('id').defaultRandom().primaryKey(),
	productId: uuid('product_id').references(() => products.id),
	url: text('url'),
	altText: varchar('alt_text'),
	isPrimary: boolean('is_primary').default(false),
	displayOrder: integer('display_order'),
});

export const productVariants = pgTable('product_variants', {
	id: uuid('id').defaultRandom().primaryKey(),
	productId: uuid('product_id').references(() => products.id),
	sku: varchar('sku').unique(),
	name: varchar('name'),
	priceAmount: bigint('price_amount', { mode: 'number' }),
	priceCurrency: varchar('price_currency').references(() => currencies.code),
	compareAtAmount: bigint('compare_at_amount', { mode: 'number' }),
	costPriceAmount: bigint('cost_price_amount', { mode: 'number' }),
	weightKg: numeric('weight_kg', { precision: 10, scale: 3 }),
	attributes: jsonb('attributes'),
	isActive: boolean('is_active').default(true),
	updatedAt: timestamp('updated_at'),
});

export const productVariantImages = pgTable('product_variant_images', {
	id: uuid('id').defaultRandom().primaryKey(),
	variantId: uuid('variant_id').references(() => productVariants.id),
	url: text('url'),
	sortOrder: integer('sort_order'),
});

export const bundleComponents = pgTable(
	'bundle_components',
	{
		parentVariantId: uuid('parent_variant_id').references(
			() => productVariants.id,
		),
		childVariantId: uuid('child_variant_id').references(
			() => productVariants.id,
		),
		quantity: integer('quantity').default(1),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.parentVariantId, t.childVariantId] }),
	}),
);

// Relations
export const brandsRelations = relations(brands, ({ many }) => ({
	products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	parent: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: 'parent_child',
	}),
	children: many(categories, { relationName: 'parent_child' }),
	products: many(products),
	productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
	brand: one(brands, {
		fields: [products.brandId],
		references: [brands.id],
	}),
	canonicalCategory: one(categories, {
		fields: [products.canonicalCategoryId],
		references: [categories.id],
	}),
	categories: many(productCategories),
	images: many(productImages),
	variants: many(productVariants),
}));

export const productCategoriesRelations = relations(
	productCategories,
	({ one }) => ({
		product: one(products, {
			fields: [productCategories.productId],
			references: [products.id],
		}),
		category: one(categories, {
			fields: [productCategories.categoryId],
			references: [categories.id],
		}),
	}),
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
	product: one(products, {
		fields: [productImages.productId],
		references: [products.id],
	}),
}));

export const productVariantsRelations = relations(
	productVariants,
	({ one, many }) => ({
		product: one(products, {
			fields: [productVariants.productId],
			references: [products.id],
		}),
		currency: one(currencies, {
			fields: [productVariants.priceCurrency],
			references: [currencies.code],
		}),
		images: many(productVariantImages),
		bundleComponents: many(bundleComponents, {
			relationName: 'bundle_parent',
		}),
		includedInBundles: many(bundleComponents, {
			relationName: 'bundle_child',
		}),
	}),
);

export const productVariantImagesRelations = relations(
	productVariantImages,
	({ one }) => ({
		variant: one(productVariants, {
			fields: [productVariantImages.variantId],
			references: [productVariants.id],
		}),
	}),
);

export const bundleComponentsRelations = relations(
	bundleComponents,
	({ one }) => ({
		parentVariant: one(productVariants, {
			fields: [bundleComponents.parentVariantId],
			references: [productVariants.id],
			relationName: 'bundle_parent',
		}),
		childVariant: one(productVariants, {
			fields: [bundleComponents.childVariantId],
			references: [productVariants.id],
			relationName: 'bundle_child',
		}),
	}),
);
