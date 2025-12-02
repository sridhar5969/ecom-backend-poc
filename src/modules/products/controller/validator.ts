import { z, infer as zodInfer } from 'zod/v4';

const validateGetProductsByCategory = z.object({
	categoryId: z.string().min(1),
});

const BundleComponentSchema = z.object({
	variantId: z.string().uuid('Invalid variant ID format'),
	quantity: z.number().int().positive('Quantity must be a positive integer'),
});

const CreateBundleSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	slug: z.string().min(1, 'Slug is required'),
	flags: z
		.object({
			isFeatured: z.boolean().optional(),
			isOnSale: z.boolean().optional(),
		})
		.optional(),
	brandId: z.string().uuid('Invalid brand ID').optional(),
	canonicalCategoryId: z.string().uuid('Invalid category ID').optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	variant: z.object({
		sku: z.string().min(1, 'SKU is required'),
		name: z.string().min(1, 'Variant name is required'),
		priceAmount: z.number().positive('Price must be positive'),
		priceCurrency: z.string().default('NGN'),
		compareAtAmount: z.number().positive().optional(),
		costPriceAmount: z.number().positive().optional(),
		weightKg: z.number().positive().optional(),
		attributes: z.record(z.string(), z.any()).optional(),
	}),
	components: z
		.array(BundleComponentSchema)
		.min(1, 'At least one component is required'),
});

const UpdateBundleSchema = z.object({
	components: z
		.array(BundleComponentSchema)
		.min(1, 'At least one component is required'),
});

const ProductListQuerySchema = z
	.object({
		// 1. Pagination (Coerces "10" -> 10, sets defaults)
		page: z.coerce.number().min(1).default(1),
		limit: z.coerce.number().min(1).max(100).default(20),

		// 2. Search
		search: z.string().trim().optional(),

		// 3. Sorting (Optional, defaults to created_at desc)
		sort: z.string().default('-createdAt'),

		// 4. Ranges (Coerce strings to numbers)
		min_price: z.coerce.number().min(0).optional(),
		max_price: z.coerce.number().min(0).optional(),

		// 5. Multi-Select Filters (Comma-separated string -> Array)
		// Input: ?brand=samsung,apple
		// Output: ['samsung', 'apple']
		brand: z
			.string()
			.transform((val) => (val ? val.split(',') : undefined))
			.optional(),

		category: z
			.string()
			.transform((val) => (val ? val.split(',') : undefined))
			.optional(),

		// 6. Boolean filters (e.g. ?in_stock=true)
		in_stock: z.coerce.boolean().optional(),
	})
	.strict();

export type CreateBundlePayloadType = zodInfer<typeof CreateBundleSchema>;
export type ProductListQueryType = zodInfer<typeof ProductListQuerySchema>;
export default {
	validateGetProductsByCategory,
	CreateBundleSchema,
	UpdateBundleSchema,
	BundleComponentSchema,
	ProductListQuerySchema,
};
