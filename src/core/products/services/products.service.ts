import { type SQL, and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '@/database';
import { productReviews } from '@/database/schema/content';
import {
	brands,
	categories,
	productCategories,
	productImages,
	productVariantImages,
	productVariants,
	products,
} from '@/database/schema/products';

export type ProductQueryParams = {
	page?: number;
	limit?: number;
	search?: string;
	status?: string;
	category_id?: string;
	categoryId?: string;
	brand_id?: string;
	brandId?: string;
	slug?: string;
};

export class ProductsService {
	constructor() {}

	async findProductsByCategory(categoryId: string) {
		const data = db
			.select({
				id: products.id,
				name: products.title,
			})
			.from(products)
			.innerJoin(
				productCategories,
				eq(productCategories.productId, products.id),
			)
			.where(eq(productCategories.categoryId, categoryId));
		return data;
	}

	async getAllProducts(params: ProductQueryParams = {}) {
		const page = Math.max(params.page ?? 1, 1);
		const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
		const offset = (page - 1) * limit;
		const filters: SQL[] = [];
		const searchTerm = params.search?.trim();
		const statusFilter = params.status;
		const brandFilter = params.brand_id ?? params.brandId;
		const categoryFilter = params.category_id ?? params.categoryId;

		if (statusFilter) {
			filters.push(eq(products.status, statusFilter));
		}

		if (brandFilter) {
			filters.push(eq(products.brandId, brandFilter));
		}

		if (searchTerm) {
			filters.push(ilike(products.title, `%${searchTerm}%`));
		}

		if (categoryFilter) {
			filters.push(
				sql`
					EXISTS (
						SELECT 1 FROM ${productCategories}
						WHERE ${productCategories.productId} = ${products.id}
							AND ${productCategories.categoryId} = ${categoryFilter}
					)
				`,
			);
		}

		const whereClause = filters.length ? and(...filters) : undefined;

		const priceAmountField = sql<number>`COALESCE((
			SELECT pv.price_amount
			FROM ${productVariants} pv
			WHERE pv.product_id = ${products.id}
			ORDER BY pv.price_amount ASC NULLS LAST
			LIMIT 1
		), 0)`;

		const priceCurrencyField = sql<string>`COALESCE((
			SELECT pv.price_currency
			FROM ${productVariants} pv
			WHERE pv.product_id = ${products.id}
			ORDER BY pv.price_amount ASC NULLS LAST
			LIMIT 1
		), 'NGN')`;

		const compareAtAmountField = sql<number | null>`(
			SELECT pv.compare_at_amount
			FROM ${productVariants} pv
			WHERE pv.product_id = ${products.id}
			ORDER BY pv.price_amount ASC NULLS LAST
			LIMIT 1
		)`;

		const primaryImageField = sql<string | null>`(
			SELECT pi.url
			FROM ${productImages} pi
			WHERE pi.product_id = ${products.id}
			ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
			LIMIT 1
		)`;

		const averageRatingField = sql<number | null>`(
			SELECT AVG(pr.rating)::numeric(10,2)
			FROM ${productReviews} pr
			WHERE pr.product_id = ${products.id}
				AND pr.status = 'approved'
		)`;

		const reviewCountField = sql<number>`COALESCE((
			SELECT COUNT(*)
			FROM ${productReviews} pr
			WHERE pr.product_id = ${products.id}
				AND pr.status = 'approved'
		), 0)`;

		const baseProductsQuery = db
			.select({
				id: products.id,
				title: products.title,
				slug: products.slug,
				description: products.description,
				status: products.status,
				createdAt: products.createdAt,
				brandId: brands.id,
				brandName: brands.name,
				brandSlug: brands.slug,
				categoryId: categories.id,
				categoryName: categories.name,
				categorySlug: categories.slug,
				priceAmount: priceAmountField,
				priceCurrency: priceCurrencyField,
				compareAtAmount: compareAtAmountField,
				primaryImageUrl: primaryImageField,
				averageRating: averageRatingField,
				reviewCount: reviewCountField,
			})
			.from(products)
			.leftJoin(brands, eq(brands.id, products.brandId))
			.leftJoin(
				categories,
				eq(categories.id, products.canonicalCategoryId),
			);

		const filteredProductsQuery = whereClause
			? baseProductsQuery.where(whereClause)
			: baseProductsQuery;

		const productsQuery = filteredProductsQuery
			.orderBy(
				sql`COALESCE(${products.updatedAt}, ${products.createdAt}) DESC`,
			)
			.limit(limit)
			.offset(offset);

		const baseTotalCountQuery = db
			.select({ count: sql<number>`COUNT(*)` })
			.from(products);
		const totalCountQuery = whereClause
			? baseTotalCountQuery.where(whereClause)
			: baseTotalCountQuery;

		const [rows, totalCountResult] = await Promise.all([
			productsQuery,
			totalCountQuery,
		]);

		const total = Number(totalCountResult[0]?.count);

		const items = rows.map((row) => ({
			id: row.id,
			title: row.title ?? '',
			slug: row.slug ?? '',
			description: row.description,
			price_amount: Number(row.priceAmount ?? 0),
			price_currency: row.priceCurrency ?? 'NGN',
			compare_at_amount: row.compareAtAmount ?? undefined,
			primary_image_url: row.primaryImageUrl ?? undefined,
			status: row.status,
			brand: {
				id: row.brandId ?? '',
				name: row.brandName ?? 'Unknown Brand',
				slug: row.brandSlug ?? 'unknown-brand',
			},
			category: {
				id: row.categoryId ?? '',
				name: row.categoryName ?? 'Uncategorized',
				slug: row.categorySlug ?? 'uncategorized',
			},
			average_rating:
				row.averageRating !== null && row.averageRating !== undefined
					? Number(row.averageRating)
					: undefined,
			review_count: row.reviewCount ?? 0,
			created_at: row.createdAt
				? new Date(row.createdAt).toISOString()
				: new Date().toISOString(),
		}));

		return {
			data: items,
			totalCount: total,
			totalPages: Math.ceil(total / limit),
		};
	}

	async getProductBySlug(slugValue:string) {
		if (!slugValue) {
			throw new Error('Product slug is required');
		}

		const priceAmountField = sql<number>`COALESCE((
			SELECT pv.price_amount
			FROM ${productVariants} pv
			WHERE pv.product_id = ${products.id}
			ORDER BY pv.price_amount ASC NULLS LAST
			LIMIT 1
		), 0)`;

		const priceCurrencyField = sql<string>`COALESCE((
			SELECT pv.price_currency
			FROM ${productVariants} pv
			WHERE pv.product_id = ${products.id}
			ORDER BY pv.price_amount ASC NULLS LAST
			LIMIT 1
		), 'NGN')`;

		const compareAtAmountField = sql<number | null>`(
			SELECT pv.compare_at_amount
			FROM ${productVariants} pv
			WHERE pv.product_id = ${products.id}
			ORDER BY pv.price_amount ASC NULLS LAST
			LIMIT 1
		)`;

		const primaryImageField = sql<string | null>`(
			SELECT pi.url
			FROM ${productImages} pi
			WHERE pi.product_id = ${products.id}
			ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
			LIMIT 1
		)`;

		const averageRatingField = sql<number | null>`(
			SELECT AVG(pr.rating)::numeric(10,2)
			FROM ${productReviews} pr
			WHERE pr.product_id = ${products.id}
				AND pr.status = 'approved'
		)`;

		const reviewCountField = sql<number>`COALESCE((
			SELECT COUNT(*)
			FROM ${productReviews} pr
			WHERE pr.product_id = ${products.id}
				AND pr.status = 'approved'
		), 0)`;

		const productRow = await db
			.select({
				id: products.id,
				title: products.title,
				slug: products.slug,
				description: products.description,
				status: products.status,
				metadata: products.metadata,
				flags: products.flags,
				createdAt: products.createdAt,
				updatedAt: products.updatedAt,
				brandId: brands.id,
				brandName: brands.name,
				brandSlug: brands.slug,
				brandDescription: brands.description,
				brandLogoUrl: brands.logoUrl,
				categoryId: categories.id,
				categoryName: categories.name,
				categorySlug: categories.slug,
				priceAmount: priceAmountField,
				priceCurrency: priceCurrencyField,
				compareAtAmount: compareAtAmountField,
				primaryImageUrl: primaryImageField,
				averageRating: averageRatingField,
				reviewCount: reviewCountField,
			})
			.from(products)
			.leftJoin(brands, eq(brands.id, products.brandId))
			.leftJoin(
				categories,
				eq(categories.id, products.canonicalCategoryId),
			)
			.where(eq(products.slug, slugValue))
			.limit(1);

		const product = productRow[0];
		if (!product) {
			return null;
		}

		const [variantRows, productImageRows] = await Promise.all([
			db
				.select({
					id: productVariants.id,
					sku: productVariants.sku,
					name: productVariants.name,
					priceAmount: productVariants.priceAmount,
					priceCurrency: productVariants.priceCurrency,
					compareAtAmount: productVariants.compareAtAmount,
					costPriceAmount: productVariants.costPriceAmount,
					weightKg: productVariants.weightKg,
					attributes: productVariants.attributes,
					isActive: productVariants.isActive,
					updatedAt: productVariants.updatedAt,
				})
				.from(productVariants)
				.where(eq(productVariants.productId, product.id))
				.orderBy(
					sql`${productVariants.updatedAt} DESC NULLS LAST`,
					sql`${productVariants.name} ASC NULLS LAST`,
				),
			db
				.select({
					id: productImages.id,
					url: productImages.url,
					altText: productImages.altText,
					isPrimary: productImages.isPrimary,
					displayOrder: productImages.displayOrder,
				})
				.from(productImages)
				.where(eq(productImages.productId, product.id))
				.orderBy(
					sql`${productImages.isPrimary} DESC NULLS LAST`,
					sql`${productImages.displayOrder} ASC NULLS LAST`,
				),
		]);

		let variantImagesRows: {
			id: string;
			variantId: string;
			url: string | null;
			sortOrder: number | null;
		}[] = [];

		if (variantRows.length) {
			const variantIds = variantRows.map((variant) => variant.id);
			variantImagesRows = await db
				.select({
					id: productVariantImages.id,
					variantId: productVariantImages.variantId,
					url: productVariantImages.url,
					sortOrder: productVariantImages.sortOrder,
				})
				.from(productVariantImages)
				.where(inArray(productVariantImages.variantId, variantIds))
				.orderBy(sql`${productVariantImages.sortOrder} ASC NULLS LAST`);
		}

		const variantImageMap = new Map<
			string,
			{ id: string; url: string | null; sortOrder: number | null }[]
		>();

		for (const image of variantImagesRows) {
			const list = variantImageMap.get(image.variantId) ?? [];
			list.push({
				id: image.id,
				url: image.url,
				sortOrder: image.sortOrder,
			});
			variantImageMap.set(image.variantId, list);
		}

		const variants = variantRows.map((variant) => {
			const attributes = variant.attributes as
				| Record<string, unknown>
				| null
				| undefined;
			return {
				id: variant.id,
				sku: variant.sku ?? '',
				name: variant.name ?? '',
				price_amount: Number(variant.priceAmount ?? 0),
				price_currency: variant.priceCurrency ?? 'NGN',
				compare_at_amount: variant.compareAtAmount ?? undefined,
				cost_price_amount: variant.costPriceAmount ?? undefined,
				weight_kg:
					variant.weightKg !== null && variant.weightKg !== undefined
						? Number(variant.weightKg)
						: undefined,
				attributes: attributes ?? undefined,
				is_active: variant.isActive ?? true,
				updated_at: variant.updatedAt
					? new Date(variant.updatedAt).toISOString()
					: undefined,
				images: (variantImageMap.get(variant.id) ?? []).map(
					(image) => ({
						id: image.id,
						url: image.url ?? undefined,
						sort_order: image.sortOrder ?? undefined,
					}),
				),
			};
		});

		const variantPrices = variants.map((variant) => variant.price_amount);
		const basePrice = Number(product.priceAmount ?? 0);
		const minPrice = variantPrices.length
			? Math.min(...variantPrices)
			: basePrice;
		const maxPrice = variantPrices.length
			? Math.max(...variantPrices)
			: basePrice;
		const metadata = (product.metadata ?? null) as
			| Record<string, unknown>
			| null
			| undefined;
		const flags = (product.flags ?? null) as
			| Record<string, unknown>
			| null
			| undefined;

		return {
			id: product.id,
			title: product.title ?? '',
			slug: product.slug ?? '',
			description: product.description,
			status: product.status,
			brand: {
				id: product.brandId ?? '',
				name: product.brandName ?? 'Unknown Brand',
				slug: product.brandSlug ?? 'unknown-brand',
				description: product.brandDescription ?? undefined,
				logo_url: product.brandLogoUrl ?? undefined,
			},
			category: {
				id: product.categoryId ?? '',
				name: product.categoryName ?? 'Uncategorized',
				slug: product.categorySlug ?? 'uncategorized',
			},
			price_summary: {
				base_amount: basePrice,
				currency: product.priceCurrency ?? 'NGN',
				compare_at_amount: product.compareAtAmount ?? undefined,
				range: {
					min: minPrice,
					max: maxPrice,
				},
			},
			primary_image_url: product.primaryImageUrl ?? undefined,
			images: productImageRows.map((image) => ({
				id: image.id,
				url: image.url ?? undefined,
				alt_text: image.altText ?? undefined,
				is_primary: image.isPrimary ?? false,
				display_order: image.displayOrder ?? undefined,
			})),
			variants,
			reviews: {
				average_rating:
					product.averageRating !== null &&
					product.averageRating !== undefined
						? Number(product.averageRating)
						: undefined,
				review_count: product.reviewCount ?? 0,
			},
			metadata: metadata ?? undefined,
			flags: flags ?? undefined,
			created_at: product.createdAt
				? new Date(product.createdAt).toISOString()
				: undefined,
			updated_at: product.updatedAt
				? new Date(product.updatedAt).toISOString()
				: undefined,
		};
	}
}
