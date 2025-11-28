import { eq, inArray, sql } from 'drizzle-orm';

import { BUNDLE_MESSAGES } from '../constants/bundle-messages';
import { CreateBundlePayloadType } from '../controller/validator';
import AppError from '@/abstractions/AppError';
import { db } from '@/database';
import {
	bundleComponents,
	productImages,
	products,
	productVariants,
} from '@/database/schema';

export class ProductBundlesManagementService {
	async createBundle(data: CreateBundlePayloadType) {
		try {
			return await db.transaction(async (tx) => {
				const childVariantIds = data.components.map((c) => c.variantId);
				const existingVariants = await tx
					.select({ id: productVariants.id })
					.from(productVariants)
					.where(inArray(productVariants.id, childVariantIds));

				if (existingVariants.length !== childVariantIds.length) {
					throw new AppError(
						BUNDLE_MESSAGES.COMPONENT_VARIANTS_NOT_FOUND,
						400,
					);
				}

				const newProduct = await tx
					.insert(products)
					.values({
						title: data.title,
						description: data.description,
						type: 'bundle',
						slug: data.slug,
						flags: data.flags,
						brandId: data.brandId,
						canonicalCategoryId: data.canonicalCategoryId,
						metadata: data.metadata,
						status: 'published',
					})
					.returning({ id: products.id });

				const productId = newProduct[0].id;

				const newVariant = await tx
					.insert(productVariants)
					.values({
						productId,
						sku: data.variant.sku,
						name: data.variant.name,
						priceAmount: data.variant.priceAmount,
						priceCurrency: data.variant.priceCurrency,
						compareAtAmount: data.variant.compareAtAmount,
						costPriceAmount: data.variant.costPriceAmount,
						weightKg: data.variant.weightKg?.toString(),
						attributes: data.variant.attributes,
						isActive: true,
					})
					.returning({ id: productVariants.id });

				const variantId = newVariant[0].id;

				const bundleComponentsData = data.components.map((comp) => ({
					parentVariantId: variantId,
					childVariantId: comp.variantId,
					quantity: comp.quantity,
				}));

				await tx.insert(bundleComponents).values(bundleComponentsData);

				return {
					success: true,
					message: BUNDLE_MESSAGES.BUNDLE_CREATED_SUCCESS,
					productId,
					variantId,
					componentsCount: data.components.length,
				};
			});
		} catch (error: unknown) {
			if (error instanceof AppError) {
				throw error;
			}

			const dbError = error as any;
			if (dbError?.code === '23505' || dbError?.cause?.code === '23505') {
				const constraint =
					dbError.constraint || dbError.cause?.constraint;
				if (constraint === 'products_slug_unique') {
					throw new AppError(
						`Product slug '${data.slug}' already exists`,
						409,
					);
				}
				if (constraint === 'product_variants_sku_unique') {
					throw new AppError(
						`Variant SKU '${data.variant.sku}' already exists`,
						409,
					);
				}
				throw new AppError('Duplicate entry found', 409);
			}

			if (dbError?.code === '23503' || dbError?.cause?.code === '23503') {
				throw new AppError(
					'Invalid brand or category ID provided',
					400,
				);
			}

			throw new AppError('Failed to create bundle product', 500);
		}
	}

	async getAvailableVariantsForBundle() {
		const variants = await db
			.select({
				variantId: productVariants.id,
				variantSku: productVariants.sku,
				variantName: productVariants.name,
				productId: products.id,
				productTitle: products.title,
				productSlug: products.slug,
				productType: products.type,
				priceAmount: productVariants.priceAmount,
				priceCurrency: productVariants.priceCurrency,
			})
			.from(productVariants)
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(eq(productVariants.isActive, true));

		return variants.map((v) => ({
			variant_id: v.variantId,
			variant_sku: v.variantSku ?? '',
			variant_name: v.variantName ?? '',
			product_id: v.productId,
			product_title: v.productTitle ?? '',
			product_slug: v.productSlug ?? '',
			product_type: v.productType,
			price_amount: Number(v.priceAmount ?? 0),
			price_currency: v.priceCurrency ?? 'NGN',
		}));
	}

	async updateBundle({
		variantId,
		components,
	}: {
		variantId: string;
		components: { variantId: string; quantity: number }[];
	}) {
		try {
			const variant = await db
				.select({
					id: productVariants.id,
					productId: productVariants.productId,
					productType: products.type,
				})
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(eq(productVariants.id, variantId))
				.limit(1);

			if (!variant.length) {
				throw new AppError(BUNDLE_MESSAGES.VARIANT_NOT_FOUND, 404);
			}

			if (variant[0].productType !== 'bundle') {
				throw new AppError(
					BUNDLE_MESSAGES.PRODUCT_NOT_BUNDLE_TYPE,
					400,
				);
			}

			const childVariantIds = components.map((c) => c.variantId);
			const existingVariants = await db
				.select({ id: productVariants.id })
				.from(productVariants)
				.where(inArray(productVariants.id, childVariantIds));

			if (existingVariants.length !== childVariantIds.length) {
				throw new AppError(
					BUNDLE_MESSAGES.COMPONENT_VARIANTS_NOT_FOUND,
					400,
				);
			}

			await db
				.delete(bundleComponents)
				.where(eq(bundleComponents.parentVariantId, variantId));

			const bundleComponentsData = components.map((comp) => ({
				parentVariantId: variantId,
				childVariantId: comp.variantId,
				quantity: comp.quantity,
			}));

			await db.insert(bundleComponents).values(bundleComponentsData);

			return {
				success: true,
				message: BUNDLE_MESSAGES.BUNDLE_UPDATED_SUCCESS,
				variantId,
				componentsCount: components.length,
			};
		} catch (error: any) {
			if (error instanceof AppError) {
				throw error;
			}
			throw new AppError('Failed to update bundle', 500);
		}
	}

	async deleteBundle(variantId: string) {
		try {
			await db
				.delete(bundleComponents)
				.where(eq(bundleComponents.parentVariantId, variantId));

			return {
				success: true,
				message: BUNDLE_MESSAGES.BUNDLE_DELETED_SUCCESS,
			};
		} catch {
			throw new AppError('Failed to delete bundle', 500);
		}
	}

	async getBundlesForProduct(productId: string) {
		const variantIds = await db
			.select({ id: productVariants.id })
			.from(productVariants)
			.where(eq(productVariants.productId, productId));

		if (!variantIds.length) {
			return [];
		}

		const bundleRows = await db
			.select({
				bundleProductId: products.id,
				bundleProductTitle: products.title,
				bundleProductSlug: products.slug,
				bundleProductDescription: products.description,
				bundleVariantId: productVariants.id,
				bundleVariantSku: productVariants.sku,
				bundleVariantName: productVariants.name,
				bundleVariantPriceAmount: productVariants.priceAmount,
				bundleVariantPriceCurrency: productVariants.priceCurrency,
				bundleVariantCompareAtAmount: productVariants.compareAtAmount,
				childVariantId: bundleComponents.childVariantId,
				quantity: bundleComponents.quantity,
				primaryImageUrl: sql<string | null>`(
					SELECT pi.url
					FROM ${productImages} pi
					WHERE pi.product_id = ${products.id}
					ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
					LIMIT 1
				)`,
			})
			.from(bundleComponents)
			.innerJoin(
				productVariants,
				eq(bundleComponents.parentVariantId, productVariants.id),
			)
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(
				inArray(
					bundleComponents.childVariantId,
					variantIds.map((v) => v.id),
				),
			);

		const bundleMap = new Map<
			string,
			{
				id: string;
				title: string;
				slug: string;
				description: string | null;
				variant_id: string;
				variant_sku: string | null;
				variant_name: string | null;
				price_amount: number;
				price_currency: string;
				compare_at_amount: number | null;
				primary_image_url: string | null;
				components: { variant_id: string; quantity: number }[];
			}
		>();

		for (const row of bundleRows) {
			const bundleKey = row.bundleVariantId;
			if (!bundleKey) continue;

			if (!bundleMap.has(bundleKey)) {
				bundleMap.set(bundleKey, {
					id: row.bundleProductId ?? '',
					title: row.bundleProductTitle ?? '',
					slug: row.bundleProductSlug ?? '',
					description: row.bundleProductDescription ?? null,
					variant_id: row.bundleVariantId,
					variant_sku: row.bundleVariantSku ?? null,
					variant_name: row.bundleVariantName ?? null,
					price_amount: Number(row.bundleVariantPriceAmount ?? 0),
					price_currency: row.bundleVariantPriceCurrency ?? 'NGN',
					compare_at_amount: row.bundleVariantCompareAtAmount ?? null,
					primary_image_url: row.primaryImageUrl ?? null,
					components: [],
				});
			}

			const bundle = bundleMap.get(bundleKey);
			if (bundle && row.childVariantId) {
				bundle.components.push({
					variant_id: row.childVariantId,
					quantity: row.quantity ?? 1,
				});
			}
		}

		return Array.from(bundleMap.values());
	}

	async getBundleDetails(bundleProductSlug: string) {
		try {
			const bundleProduct = await db
				.select({
					id: products.id,
					title: products.title,
					slug: products.slug,
					description: products.description,
					type: products.type,
				})
				.from(products)
				.where(eq(products.slug, bundleProductSlug))
				.limit(1);

			if (!bundleProduct.length || bundleProduct[0].type !== 'bundle') {
				return null;
			}

			const product = bundleProduct[0];

			const bundleVariants = await db
				.select({
					variantId: productVariants.id,
					variantSku: productVariants.sku,
					variantName: productVariants.name,
					priceAmount: productVariants.priceAmount,
					priceCurrency: productVariants.priceCurrency,
					compareAtAmount: productVariants.compareAtAmount,
				})
				.from(productVariants)
				.where(eq(productVariants.productId, product.id));

			const components = [];
			for (const variant of bundleVariants) {
				const componentRows = await db
					.select({
						childVariantId: bundleComponents.childVariantId,
						quantity: bundleComponents.quantity,
						childProductId: products.id,
						childProductTitle: products.title,
						childProductSlug: products.slug,
						childVariantSku: productVariants.sku,
						childVariantName: productVariants.name,
						childPriceAmount: productVariants.priceAmount,
						childPriceCurrency: productVariants.priceCurrency,
					})
					.from(bundleComponents)
					.innerJoin(
						productVariants,
						eq(bundleComponents.childVariantId, productVariants.id),
					)
					.innerJoin(
						products,
						eq(productVariants.productId, products.id),
					)
					.where(
						eq(bundleComponents.parentVariantId, variant.variantId),
					);

				components.push({
					bundle_variant: {
						id: variant.variantId,
						sku: variant.variantSku ?? '',
						name: variant.variantName ?? '',
						price_amount: Number(variant.priceAmount ?? 0),
						price_currency: variant.priceCurrency ?? 'NGN',
						compare_at_amount: variant.compareAtAmount ?? undefined,
					},
					items: componentRows.map((comp) => ({
						product_id: comp.childProductId ?? '',
						product_title: comp.childProductTitle ?? '',
						product_slug: comp.childProductSlug ?? '',
						variant_id: comp.childVariantId ?? '',
						variant_sku: comp.childVariantSku ?? '',
						variant_name: comp.childVariantName ?? '',
						price_amount: Number(comp.childPriceAmount ?? 0),
						price_currency: comp.childPriceCurrency ?? 'NGN',
						quantity: comp.quantity ?? 1,
					})),
				});
			}

			return {
				id: product.id,
				title: product.title ?? '',
				slug: product.slug ?? '',
				description: product.description ?? null,
				type: product.type,
				bundles: components,
			};
		} catch (error: any) {
			if (error instanceof AppError) {
				throw error;
			}
			throw new AppError('Failed to get bundle details', 500);
		}
	}

	async getBundlesByVariant(variantIds: string[]) {
		const isInBundle = await db
			.select({ parentVariantId: bundleComponents.parentVariantId })
			.from(bundleComponents)
			.where(inArray(bundleComponents.childVariantId, variantIds));
		if (!isInBundle.length) {
			return [];
		}

		const parentVariantIds = isInBundle.map((b) => b.parentVariantId);

		const bundleRows = await db
			.select({
				bundleProductId: products.id,
				bundleProductTitle: products.title,
				bundleProductSlug: products.slug,
				bundleProductDescription: products.description,
				bundleProductBrandId: products.brandId,
				bundleVariantId: productVariants.id,
				bundleVariantSku: productVariants.sku,
				bundleVariantName: productVariants.name,
				bundleVariantPriceAmount: productVariants.priceAmount,
				bundleVariantPriceCurrency: productVariants.priceCurrency,
				bundleVariantCompareAtAmount: productVariants.compareAtAmount,
				childVariantId: bundleComponents.childVariantId,
				quantity: bundleComponents.quantity,
				primaryImageUrl: sql<string | null>`(
					SELECT pi.url
					FROM ${productImages} pi
					WHERE pi.product_id = ${products.id}
					ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
					LIMIT 1
				)`,
			})
			.from(bundleComponents)
			.innerJoin(
				productVariants,
				eq(bundleComponents.parentVariantId, productVariants.id),
			)
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(inArray(bundleComponents.parentVariantId, parentVariantIds));

		const bundleMap = new Map<
			string,
			{
				id: string;
				title: string;
				slug: string;
				description: string | null;
				brand_id: string | null;
				variant_id: string;
				variant_sku: string | null;
				variant_name: string | null;
				price_amount: number;
				price_currency: string;
				compare_at_amount: number | null;
				primary_image_url: string | null;
				components: {
					variant_id: string;
					quantity: number;
					product_id: string;
					product_title: string;
					product_slug: string;
					product_description: string | null;
					brand_id: string | null;
					variant_sku: string | null;
					variant_name: string | null;
					price_amount: number;
					price_currency: string;
					primary_image_url: string | null;
				}[];
			}
		>();

		for (const row of bundleRows) {
			const bundleKey = row.bundleVariantId;
			if (!bundleKey) continue;

			if (!bundleMap.has(bundleKey)) {
				bundleMap.set(bundleKey, {
					id: row.bundleProductId ?? '',
					title: row.bundleProductTitle ?? '',
					slug: row.bundleProductSlug ?? '',
					description: row.bundleProductDescription ?? null,
					brand_id: row.bundleProductBrandId ?? null,
					variant_id: row.bundleVariantId,
					variant_sku: row.bundleVariantSku ?? null,
					variant_name: row.bundleVariantName ?? null,
					price_amount: Number(row.bundleVariantPriceAmount ?? 0),
					price_currency: row.bundleVariantPriceCurrency ?? 'NGN',
					compare_at_amount: row.bundleVariantCompareAtAmount ?? null,
					primary_image_url: row.primaryImageUrl ?? null,
					components: [],
				});
			}
		}

		const allChildVariantIds = bundleRows
			.map((r) => r.childVariantId)
			.filter((id): id is string => id !== null);

		if (allChildVariantIds.length > 0) {
			const componentDetails = await db
				.select({
					variantId: productVariants.id,
					variantSku: productVariants.sku,
					variantName: productVariants.name,
					priceAmount: productVariants.priceAmount,
					priceCurrency: productVariants.priceCurrency,
					productId: products.id,
					productTitle: products.title,
					productSlug: products.slug,
					productDescription: products.description,
					brandId: products.brandId,
					primaryImageUrl: sql<string | null>`(
						SELECT pi.url
						FROM ${productImages} pi
						WHERE pi.product_id = ${products.id}
						ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
						LIMIT 1
					)`,
				})
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(inArray(productVariants.id, allChildVariantIds));

			const componentMap = new Map(
				componentDetails.map((c) => [c.variantId, c]),
			);

			for (const row of bundleRows) {
				const bundleKey = row.bundleVariantId;
				if (!bundleKey || !row.childVariantId) continue;

				const bundle = bundleMap.get(bundleKey);
				const componentDetail = componentMap.get(row.childVariantId);

				if (bundle && componentDetail) {
					bundle.components.push({
						variant_id: row.childVariantId,
						quantity: row.quantity ?? 1,
						product_id: componentDetail.productId ?? '',
						product_title: componentDetail.productTitle ?? '',
						product_slug: componentDetail.productSlug ?? '',
						product_description:
							componentDetail.productDescription ?? null,
						brand_id: componentDetail.brandId ?? null,
						variant_sku: componentDetail.variantSku ?? null,
						variant_name: componentDetail.variantName ?? null,
						price_amount: Number(componentDetail.priceAmount ?? 0),
						price_currency: componentDetail.priceCurrency ?? 'NGN',
						primary_image_url:
							componentDetail.primaryImageUrl ?? null,
					});
				}
			}
		}

		return Array.from(bundleMap.values());
	}
}
