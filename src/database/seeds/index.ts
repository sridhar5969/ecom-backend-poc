import { randomUUID } from 'crypto';
import { db } from '../index';
import { banner, featuredProducts, relatedProducts } from '../schema/content';
import { inventoryLevels, stores } from '../schema/inventory';
import { shippingRates } from '../schema/orders';
import {
	brands,
	categories,
	productCategories,
	productImages,
	products,
	productVariants,
} from '../schema/products';
import { promoCodes } from '../schema/promotions';
import { rolePermissions } from '../schema/rolePermissions';
import {
	currencies,
	masterHelpArticles,
	masterReturnReasons,
	masterSystemSettings,
	permissions,
	taxRules,
} from '../schema/system';
import { users } from '../schema/users';

import { seedGeoData } from './country-city-states';
import bannersData from './data/banners.json';
import brandsData from './data/brands.json';
import categoriesData from './data/categories.json';
import currenciesData from './data/currencies.json';
import helpArticlesData from './data/helpArticles.json';
import permissionsData from './data/permissions.json';
import productsData from './data/products.json';
import promoCodesData from './data/promoCodes.json';
import returnReasonsData from './data/returnReasons.json';
import rolePermissionsData from './data/rolePermissions.json';
import shippingRatesData from './data/shipping-rates.json';
import storesData from './data/stores.json';
import systemSettingsData from './data/systemSettings.json';
import taxRulesData from './data/taxRules.json';
import usersData from './data/users.json';

// Maps to store old ID -> new UUID
const categoryMap = new Map<string, string>();
const storeMap = new Map<string, string>();
const brandMap = new Map<string, string>();
const productMap = new Map<string, string>();
const variantMap = new Map<string, string>();

function getUuid(oldId: string): string {
	// If it's already a UUID, return it
	if (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			oldId,
		)
	) {
		return oldId;
	}
	return randomUUID();
}

export async function seedMasterData() {
	console.log('🌱 Seeding master data...');

	console.log('  → Seeding currencies...');
	await db.insert(currencies).values(currenciesData).onConflictDoNothing();

	console.log('  → Seeding tax rules...');
	await db
		.insert(taxRules)
		.values(
			taxRulesData.map((rule) => ({
				...rule,
				startAt: rule.startAt ? new Date(rule.startAt) : undefined,
				endAt: rule.endAt ? new Date(rule.endAt) : undefined,
				rate:
					typeof rule.rate === 'number'
						? rule.rate.toString()
						: rule.rate,
			})),
		)
		.onConflictDoNothing();

	console.log('  → Seeding permissions...');
	await db.insert(permissions).values(permissionsData).onConflictDoNothing();

	console.log('  → Seeding return reasons...');
	await db
		.insert(masterReturnReasons)
		.values(returnReasonsData)
		.onConflictDoNothing();

	console.log('  → Seeding help articles...');
	await db
		.insert(masterHelpArticles)
		.values(helpArticlesData)
		.onConflictDoNothing();

	console.log('  → Seeding system settings...');
	await db
		.insert(masterSystemSettings)
		.values(systemSettingsData)
		.onConflictDoNothing();

	console.log('  → Seeding brands...');
	const existingBrands = await db.select().from(brands);
	const existingBrandSlugMap = new Map(
		existingBrands.map((b) => [b.slug, b.id]),
	);

	// Generate UUIDs for brands
	for (const brand of brandsData) {
		if (existingBrandSlugMap.has(brand.slug)) {
			brandMap.set(brand.id, existingBrandSlugMap.get(brand.slug)!);
		} else {
			const newId = getUuid(brand.id);
			brandMap.set(brand.id, newId);
		}
	}

	await db
		.insert(brands)
		.values(
			brandsData.map((brand) => ({
				...brand,
				id: brandMap.get(brand.id)!,
			})),
		)
		.onConflictDoNothing();

	console.log('  → Seeding categories...');
	const existingCategories = await db.select().from(categories);
	const existingCategorySlugMap = new Map(
		existingCategories.map((c) => [c.slug, c.id]),
	);

	// Generate UUIDs for categories
	for (const cat of categoriesData) {
		if (existingCategorySlugMap.has(cat.slug)) {
			categoryMap.set(cat.id, existingCategorySlugMap.get(cat.slug)!);
		} else {
			const newId = getUuid(cat.id);
			categoryMap.set(cat.id, newId);
		}
	}

	await db
		.insert(categories)
		.values(
			categoriesData.map((cat) => ({
				...cat,
				id: categoryMap.get(cat.id)!,
				parentId: cat.parentId ? categoryMap.get(cat.parentId) : null,
			})),
		)
		.onConflictDoNothing();

	console.log('  → Seeding stores...');
	const existingStores = await db.select().from(stores);
	const existingStoreNameMap = new Map(
		existingStores.map((s) => [s.name, s.id]),
	);

	// Generate UUIDs for stores
	for (const store of storesData) {
		if (existingStoreNameMap.has(store.name)) {
			storeMap.set(store.id, existingStoreNameMap.get(store.name)!);
		} else {
			const newId = getUuid(store.id);
			storeMap.set(store.id, newId);
		}
	}

	await db
		.insert(stores)
		.values(
			storesData.map((store) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { code, ...storeData } = store as any;
				return {
					...storeData,
					id: storeMap.get(store.id)!,
					startsAt: store.startsAt
						? new Date(store.startsAt)
						: undefined,
					endsAt: store.endsAt ? new Date(store.endsAt) : undefined,
				};
			}),
		)
		.onConflictDoNothing();

	console.log('  → Seeding shipping rates...');
	await db
		.insert(shippingRates)
		.values(
			shippingRatesData.map((rate) => ({
				...rate,
				fulfillmentType: rate.fulfillmentType as any,
			})),
		)
		.onConflictDoNothing();

	console.log('  → Seeding promo codes...');
	await db
		.insert(promoCodes)
		.values(
			promoCodesData.map((code) => ({
				...code,
				startsAt: code.startsAt ? new Date(code.startsAt) : undefined,
				endsAt: code.endsAt ? new Date(code.endsAt) : undefined,
			})),
		)
		.onConflictDoNothing();

	console.log('  → Seeding banners...');
	await db
		.insert(banner)
		.values(
			bannersData.map((b) => ({
				...b,
				startAt: b.startAt ? new Date(b.startAt) : undefined,
				endAt: b.endAt ? new Date(b.endAt) : undefined,
			})),
		)
		.onConflictDoNothing();

	console.log('✅ Master data seeded successfully!');
}

export async function seedUsers() {
	console.log('🌱 Seeding users...');
	for (const userData of usersData) {
		await db
			.insert(users)
			.values({
				...userData.user,
				role: userData.roleName.toLowerCase() as any,
			})
			.onConflictDoNothing();
	}
	console.log('✅ Users seeded successfully!');
}

export async function seedRolePermissions() {
	console.log('🌱 Seeding role permissions...');
	const allPermissions = await db.select().from(permissions);
	const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

	for (const rp of rolePermissionsData) {
		const permissionId = permissionMap.get(rp.permissionName);
		if (permissionId) {
			await db
				.insert(rolePermissions)
				.values({
					role: rp.role as any,
					permissionId: permissionId,
				})
				.onConflictDoNothing();
		}
	}
	console.log('✅ Role permissions seeded successfully!');
}

export async function seedProducts() {
	console.log('🌱 Seeding products...');

	const existingProducts = await db.select().from(products);
	const existingProductSlugMap = new Map(
		existingProducts.map((p) => [p.slug, p.id]),
	);

	// Pre-generate UUIDs
	for (const p of productsData) {
		if (existingProductSlugMap.has(p.slug)) {
			productMap.set(p.id, existingProductSlugMap.get(p.slug)!);
		} else {
			productMap.set(p.id, getUuid(p.id));
		}

		if (p.variants) {
			for (const v of p.variants) {
				variantMap.set(v.id, getUuid(v.id));
			}
		}
	}

	for (const productData of productsData) {
		const productId = productMap.get(productData.id)!;

		const {
			categories: prodCategories,
			images,
			variants,
			relatedProducts: _relProducts,
			featured,
			...productFields
		} = productData;

		const [product] = await db
			.insert(products)
			.values({
				...productFields,
				id: productId,
				brandId: productFields.brandId
					? brandMap.get(productFields.brandId) ||
						productFields.brandId
					: null,
				canonicalCategoryId: productData.canonicalCategoryId
					? categoryMap.get(productData.canonicalCategoryId)
					: null,
				type: productData.type as any,
			})
			.onConflictDoNothing()
			.returning();

		if (product && prodCategories && prodCategories.length > 0) {
			await db
				.insert(productCategories)
				.values(
					prodCategories.map((catId: string) => ({
						productId: product.id,
						categoryId: categoryMap.get(catId)!,
					})),
				)
				.onConflictDoNothing();
		}

		if (product && images && images.length > 0) {
			await db.insert(productImages).values(
				images.map((img: any, idx: number) => ({
					productId: product.id,
					url: img.url,
					altText: img.altText,
					isPrimary: idx === 0,
					displayOrder: idx,
				})),
			);
		}

		if (product && variants) {
			for (const variantData of variants) {
				const variantId = variantMap.get(variantData.id)!;
				const { inventory, ...variantFields } = variantData;

				const [variant] = await db
					.insert(productVariants)
					.values({
						...variantFields,
						id: variantId,
						productId: product.id,
					})
					.onConflictDoNothing()
					.returning();

				if (variant && inventory && inventory.length > 0) {
					await db
						.insert(inventoryLevels)
						.values(
							inventory.map((inv: any) => ({
								variantId: variant.id,
								storeId: storeMap.get(inv.storeId)!,
								stock: inv.stock,
								reservedStock: 0,
							})),
						)
						.onConflictDoNothing();
				}
			}
		}

		if (product && featured) {
			await db
				.insert(featuredProducts)
				.values({
					productId: product.id,
					variantId: variantMap.get(productData.variants?.[0]?.id),
					section: featured.section,
					displayOrder: featured.displayOrder,
					isActive: true,
				})
				.onConflictDoNothing();
		}
	}

	console.log('  → Seeding related products...');
	for (const productData of productsData) {
		const productId = productMap.get(productData.id)!;
		const { relatedProducts: relProducts } = productData;

		if (relProducts && relProducts.length > 0) {
			await db
				.insert(relatedProducts)
				.values(
					relProducts.map((relId: string, idx: number) => ({
						productId: productId,
						relatedProductId: productMap.get(relId)!,
						relationType: 'similar',
						displayOrder: idx,
					})),
				)
				.onConflictDoNothing();
		}
	}

	console.log('✅ Products seeded successfully!');

	await seedGeoData();
}
