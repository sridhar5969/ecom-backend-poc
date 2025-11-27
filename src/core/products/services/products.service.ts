import { type SQL, and, eq, ilike, sql } from 'drizzle-orm';
import { db } from '@/database';
import { productReviews } from '@/database/schema/content';
import {
	brands,
	categories,
	productCategories,
	productImages,
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
}
